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
 *
 * retryAttempt: current retry depth used for retry delay/backoff handling.
 * isResuming: true when explicitly resuming so offset reset is skipped.
 * initialOptions: initial call snapshot used to make refresh deterministic.
 *
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
   */
  const optionsSnapshot = initialOptions ?? { ...options, strategy };

  /**
   * Re-runs upload with shared snapshot/context and optional action sync.
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
   */
  const reportedErrors = new WeakSet<object>();

  /**
   * Converts arbitrary promise rejection values into Error objects for
   * callback/API consistency.
   *
   */
  const toError = (e: unknown): Error =>
    e instanceof Error ? e : new Error(String(e));

  /**
   * Reports each object error at most once without crashing on primitives.
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
   */
  const shouldThrowError = (e: unknown): boolean => {
    if (typeof throwOnError === "function") {
      return throwOnError(e);
    }

    return Boolean(throwOnError);
  };

  /**
   * Handles user-triggered aborts.
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