export * from "./types";
import {
  UploadParams,
  UploadResponse,
  UploadResponseWithMethod,
  UploadResult,
  UploadMethod,
} from "./types";
import { wait } from "./utils";
import { syncLatestActions } from "./helper";

/**
 * Orchestrates file upload by selecting the optimal method and managing retries and errors.
 * 최적의 업로드 방식을 선택하고 재시도 및 에러 처리를 관리하여 파일 업로드를 수행합니다.
 *
 * retryAttempt: current retry depth used for retry delay/backoff handling.
 * isResuming: true when explicitly resuming so offset reset is skipped.
 * initialOptions: initial call snapshot used to make refresh deterministic.
 *
 * retryAttempt: 현재 재시도 단계(지연/백오프 계산용)입니다.
 * isResuming: 명시적 resume 호출 여부(오프셋 초기화 스킵)입니다.
 * initialOptions: refresh를 항상 동일하게 만들기 위한 최초 옵션 스냅샷입니다.
 */
const upload = async (
  { url, file, options: { strategy, ...options } }: UploadParams,
  retryAttempt = 0,
  isResuming = false,
  initialOptions?: UploadParams["options"],
  sharedActionsRef?: { current?: UploadResponse["actions"] },
): Promise<UploadResponseWithMethod> => {
  /**
   * Holds the externally shared actions object so refresh/resume can update
   * handlers in place while keeping the same reference.
   *
   * 외부로 공유된 actions 객체를 보관하여 refresh/resume 이후에도
   * 동일 참조를 유지한 채 핸들러를 제자리에서 갱신할 수 있게 합니다.
   */
  const latestActionsRef = sharedActionsRef ?? {};

  const {
    onAbort,
    onRetry,
    onError,
    retryCount = 3,
    retryDelay = 1000,
    throwOnError = false,
  } = options;
  /**
   * Immutable options baseline shared across nested upload calls.
   * It keeps refresh/resume deterministic by reusing the initial inputs.
   *
   * 중첩 upload 호출 전반에서 공유되는 불변 옵션 기준값입니다.
   * 최초 입력을 재사용해 refresh/resume 동작을 일관되게 유지합니다.
   */
  const optionsSnapshot = initialOptions ?? { ...options, strategy };

  /**
   * Re-runs upload with shared snapshot/context and optional action sync.
   * 공통 스냅샷/컨텍스트로 업로드를 재실행하고 필요 시 actions를 동기화합니다.
   */
  const runUpload = async ({
    uploadArgs,
    nextRetryAttempt = retryAttempt,
    nextIsResuming = false,
    shouldSyncActions = false,
  }: {
    uploadArgs: UploadParams;
    nextRetryAttempt?: number;
    nextIsResuming?: boolean;
    shouldSyncActions?: boolean;
  }) => {
    const uploadTask = await upload(
      uploadArgs,
      nextRetryAttempt,
      nextIsResuming,
      optionsSnapshot,
      latestActionsRef,
    );

    if (shouldSyncActions) {
      syncLatestActions(latestActionsRef.current, uploadTask.actions);
    }

    return uploadTask;
  };

  if (retryAttempt === 0 && !isResuming) {
    options.offset = undefined;
  }

  /**
   * Tracks errors already reported via callbacks so a single error
   * that propagates through both wrapPromiseErrorHandler and the main
   * catch doesn't fire onError / onAbort twice when throwOnError is true.
   *
   * throwOnError가 true일 때 동일 에러가 wrapper와 메인 catch 양쪽을
   * 통과하며 onError / onAbort가 중복 호출되는 것을 방지합니다.
   */
  const reportedErrors = new WeakSet<object>();

  /**
   * Converts arbitrary promise rejection values into Error objects for
   * callback/API consistency.
   *
   * 임의의 Promise rejection 값을 콜백/API 일관성을 위해 Error 객체로 변환합니다.
   */
  const toError = (e: unknown): Error =>
    e instanceof Error ? e : new Error(String(e));

  /**
   * Reports each object error at most once without crashing on primitives.
   * primitive rejection은 WeakSet에 넣을 수 없으므로 객체만 추적합니다.
   */
  const reportOnce = <T extends Error>(e: T, report: (error: T) => void) => {
    if (reportedErrors.has(e)) {
      return;
    }

    reportedErrors.add(e);
    report(e);
  };

  /**
   * Determines whether to throw an error based on configuration.
   * 구성 설정에 따라 에러를 throw할지 결정합니다.
   */
  const shouldThrowError = (e: unknown): boolean => {
    if (typeof throwOnError === "function") {
      return throwOnError(e);
    }

    return Boolean(throwOnError);
  };

  /**
   * Handles user-triggered aborts.
   * 사용자에 의해 중단된 경우를 처리합니다.
   */
  const handleAbort = (e: DOMException): UploadResult => {
    reportOnce(e, (error) => onAbort?.(error));

    if (shouldThrowError(e)) {
      throw e;
    }

    return {
      ok: false,
      total: 0,
      message: "Aborted by user action",
      status: "aborted",
    };
  };

  /**
   * Handles generic errors during upload.
   * 업로드 중 발생하는 일반적인 에러를 처리합니다.
   */
  const handleError = (e: unknown): UploadResult => {
    const error = toError(e);

    reportOnce(error, (reportedError) => onError?.(reportedError));

    if (shouldThrowError(error)) {
      throw error;
    }

    return { ok: false, total: 0, message: error.message, status: "error" };
  };

  /**
   * Restart upload from the initial options snapshot.
   * retries/offset are reset to start from scratch.
   *
   * 초기 옵션 스냅샷으로 업로드를 재시작합니다.
   * retries/offset을 초기화하고 처음부터 시작합니다.
   */
  const refresh = () =>
    runUpload({
      uploadArgs: {
        url,
        file,
        options: {
          ...optionsSnapshot,
          offset: 0,
        },
      },
      nextRetryAttempt: 0,
      nextIsResuming: false,
      shouldSyncActions: true,
    });

  /**
   * Resume upload using the current retry context and persisted offset.
   * retryAttempt is kept and offset is not reset.
   *
   * 현재 재시도 컨텍스트와 저장된 offset으로 업로드를 재개합니다.
   * retryAttempt를 유지하고 offset을 초기화하지 않습니다.
   */
  const resume = () =>
    runUpload({
      uploadArgs: {
        url,
        file,
        options: {
          ...optionsSnapshot,
          offset: options.offset,
        },
      },
      nextRetryAttempt: retryAttempt,
      nextIsResuming: true,
      shouldSyncActions: true,
    });

  /**
   * Attempts to retry an upload operation.
   * 업로드 작업을 재시도합니다.
   */
  const retryUpload = async (
    uploadArgs: UploadParams,
  ): Promise<UploadResponse> => {
    const nextRetryAttempt = retryAttempt + 1;

    const nextRetryDelay =
      typeof retryDelay === "function"
        ? retryDelay(nextRetryAttempt)
        : retryDelay;

    await wait(nextRetryDelay);

    onRetry?.();

    const uploadResponse = await runUpload({
      uploadArgs,
      nextRetryAttempt,
      nextIsResuming: false,
      shouldSyncActions: false,
    });

    return uploadResponse;
  };

  /**
   * Wraps the upload operation with error and retry handling.
   * 에러 처리 및 재시도 로직으로 업로드 작업을 래핑합니다.
   */
  const wrapPromiseErrorHandler = async (
    uploadResponse: UploadResponse,
  ): Promise<UploadResponse> => {
    const { result: originalResult, actions: originalActions } = uploadResponse;

    const retriedResult: Promise<UploadResult> = originalResult
      .then((uploadResult) => {
        /**
         * fetch resolves for HTTP 4xx/5xx, so stream mode can return { ok: false, status: 'error' }
         * without rejecting. We rethrow here to route it through retry/onError handling.
         *
         * fetch는 HTTP 4xx/5xx에서도 reject하지 않아 stream 모드가 실패 결과를 resolve로 반환할 수 있습니다.
         * 그래서 여기서 다시 throw해서 retry/onError 흐름으로 태웁니다.
         */
        if (!uploadResult.ok && uploadResult.status === "error") {
          throw new Error(uploadResult.message || "Upload failed");
        }

        return uploadResult;
      })
      .catch(async (e) => {
        if (e instanceof DOMException && e.name === "AbortError") {
          return handleAbort(e);
        }

        if (retryCount > 0) {
          const { result: retryResult, actions: retryActions } =
            await retryUpload({
              url,
              file,
              options: {
                ...options,
                strategy,
                offset: options.offset,
                retryCount: retryCount - 1,
              },
            });

          syncLatestActions(originalActions, retryActions);
          return retryResult;
        }

        return handleError(e);
      });

    return { result: retriedResult, actions: originalActions };
  };

  if (!strategy) {
    throw new Error(
      "Upload strategy is required. Use @universal-uploader/core for auto strategy selection, or pass options.strategy when using @universal-uploader/core/base.",
    );
  }

  const uploadMethod: UploadMethod = "custom";
  const uploadFile = strategy;

  try {
    const uploadResponse = await uploadFile({
      url,
      file,
      refresh,
      resume,
      options,
    });

    // Keep a stable external actions reference while swapping in latest handlers.
    // 외부 actions 참조는 유지한 채 최신 핸들러로 교체하기 위해 저장합니다.
    if (!latestActionsRef.current) {
      latestActionsRef.current = uploadResponse.actions;
    }

    const uploadResult = await wrapPromiseErrorHandler(uploadResponse);
    const resolvedUploadMethod =
      (uploadResponse as Partial<UploadResponseWithMethod>).uploadMethod ??
      uploadMethod;

    return { ...uploadResult, uploadMethod: resolvedUploadMethod };
  } catch (e) {
    const errorUploadMethod =
      (e as Partial<UploadResponseWithMethod>).uploadMethod ?? uploadMethod;
    const uploadResult: UploadResult =
      e instanceof DOMException && e.name === "AbortError"
        ? handleAbort(e)
        : handleError(
            e instanceof Error ? e : new Error("Unknown upload error"),
          );

    return {
      result: Promise.resolve(uploadResult),
      uploadMethod: errorUploadMethod,
      actions: {
        abort: () => null,
        refresh,
        pause: () => null,
        resume: () => null,
      },
    };
  }
};

export default upload;