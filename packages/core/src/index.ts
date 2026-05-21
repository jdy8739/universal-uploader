export * from "./types";
import uploadWithStream from "./stream";
import uploadWithXhrChuncked from "./xhr-chuncked";
import {
  Upload,
  UploadResponse,
  UploadResult,
  OnProgressParams,
} from "./types";
import { checkSupportsStreamingUpload } from "./stream/helper";

/**
 * Utility function to wait for a specific duration.
 * 지정된 시간만큼 대기하기 위한 유틸리티 함수입니다.
 */
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Orchestrates file upload by selecting the optimal method and managing retries and errors.
 * 최적의 업로드 방식을 선택하고 재시도 및 에러 처리를 관리하여 파일 업로드를 수행합니다.
 */
const upload = async ({
  url,
  file,
  options: { method = "auto", ...options },
}: Upload): Promise<UploadResponse> => {
  const {
    onComplete,
    onProgress,
    onAbort,
    onRetry,
    onError,
    retryCount: retryCountArg = 3,
    retryDelay = 1000,
    throwOnError = false,
    ...restOptions
  } = options;

  const retryCount = retryCountArg;

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
    onAbort?.(e);

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
  const handleError = (e: Error): UploadResult => {
    onError?.(e);

    if (shouldThrowError(e)) {
      throw e;
    }

    return { ok: false, total: 0, message: e.message, status: "error" };
  };

  const finalOptions = {
    ...restOptions,
    onProgress: ({ loaded, total, percentage }: OnProgressParams) => {
      onProgress?.({ loaded, total, percentage });

      if (percentage === 100) {
        onComplete?.();
      }
    },
  };

  const refresh = () => upload({ url, file, options });

  /**
   * Attempts to retry an upload operation.
   * 업로드 작업을 재시도합니다.
   */
  const retryUpload = async (uploadArgs: Upload): Promise<UploadResponse> => {
    const nextRetryDelay =
      typeof retryDelay === "function" ? retryDelay(retryCount) : retryDelay;

    await wait(nextRetryDelay);

    onRetry?.();

    return upload(uploadArgs);
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
              options: { ...options, retryCount: retryCount - 1 },
            });

          Object.assign(originalActions, retryActions);
          return retryResult;
        }

        return handleError(e as Error);
      });

    return { result: Promise.resolve(retriedResult), actions: originalActions };
  };

  const uploadMethod =
    // eslint-disable-next-line no-nested-ternary
    method === "auto"
      ? checkSupportsStreamingUpload(url)
        ? "stream"
        : "xhr chunked"
      : method;

  try {
    if (uploadMethod === "stream") {
      const streamUploadResult = await wrapPromiseErrorHandler(
        await uploadWithStream({
          url,
          file,
          refresh,
          options: finalOptions,
        }),
      );

      return streamUploadResult;
    }

    if (uploadMethod === "xhr chunked") {
      const xhrChunkedUploadResult = await wrapPromiseErrorHandler(
        await uploadWithXhrChuncked({
          url,
          file,
          refresh,
          options: finalOptions,
        }),
      );

      return xhrChunkedUploadResult;
    }
  } catch (e) {
    onError?.(e as Error);
  }

  return {
    result: Promise.resolve({
      ok: false,
      total: 0,
      message: "Unsupported upload method",
      status: "error",
    }),
    actions: {
      abort: () => null,
      refresh,
    },
  };
};

export default upload;
