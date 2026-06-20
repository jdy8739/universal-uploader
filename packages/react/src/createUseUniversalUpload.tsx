import type {
  UploadParams,
  UploadResponseWithMethod,
  UploadResult,
  UploadStatus,
  UploadActions,
} from "@universal-uploader/core";
import { UploadHookOptions, UploadMethod } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_UPLOAD_RESULT: Readonly<UploadResult> = {
  ok: false,
  total: 0,
  message: undefined,
  status: "idle",
};

const FALLBACK_UPLOAD_OPTIONS: Readonly<UploadHookOptions> = {};

/**
 * No-op actions used before a request's real actions are available.
 */
const NOOP_ACTIONS: Readonly<UploadActions> = {
  abort: () => null,
  refresh: () => null,
  pause: () => null,
  resume: () => null,
};

export interface UseUniversalUploadArgs {
  url: string;
  options?: UploadHookOptions;
}

export type UploadCore = (params: UploadParams) => Promise<UploadResponseWithMethod>;

/**
 * Creates a React upload hook with the provided core upload engine.
 */
export function createUseUniversalUpload(uploadCore: UploadCore) {
  return function useUniversalUpload({
    url,
    options,
  }: UseUniversalUploadArgs) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResult>(INITIAL_UPLOAD_RESULT);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod | undefined>(
    undefined,
  );

  /**
   * The previous request abort function.
   */
  const prevReqAbortRef = useRef<UploadActions>(NOOP_ACTIONS);

  /**
   * The latest upload request ID.
   */
  const latestUploadRequestIdRef = useRef(0);

  /**
   * The options object.
   */
  const optionRef = useRef<UploadHookOptions>(
    options ?? FALLBACK_UPLOAD_OPTIONS,
  );
  // eslint-disable-next-line react-hooks/refs
  optionRef.current = options ?? FALLBACK_UPLOAD_OPTIONS;

  /**
   * Updates the upload result and status state.
   */
  const updateUploadResult = useCallback((uploadResult: UploadResult) => {
    setResult(uploadResult);
    setStatus(uploadResult.status);

    if (uploadResult.status === "error") {
      setError(
        (prevError) =>
          prevError ?? new Error(uploadResult.message || "Upload failed"),
      );
    }
  }, []);

  /**
   * Core upload logic that manages request lifecycle and status updates.
   */
  const upload = useCallback(
    async (file: File) => {
      /**
       * Increment the latest upload request ID.
       *
       * Set the latest upload request ID to the current value.
       *
       * Check if the current request is the latest upload request.
       */
      latestUploadRequestIdRef.current += 1;
      const latestUploadRequestId = latestUploadRequestIdRef.current;
      const isLatestUploadRequest = () =>
        latestUploadRequestIdRef.current === latestUploadRequestId;

      /**
       * If the previous request is still in progress, abort it, then reset to no-op
       * so controls during the await gap don't hit the aborted request's actions.
       */
      prevReqAbortRef.current.abort();
      prevReqAbortRef.current = NOOP_ACTIONS;

      /**
       * Reset external progress UI before a new upload starts.
       */
      optionRef.current?.onProgress?.({ loaded: 0, total: 0, percentage: 0 });

      setStatus("uploading");
      setError(null);
      setResult(INITIAL_UPLOAD_RESULT);
      setUploadMethod(undefined);

      const { current: $options } = optionRef;

      const {
        result: uploadResultPromise,
        actions: uploadActions,
        uploadMethod,
      } = await uploadCore({
        url,
        file,
        options: {
          ...$options,
          onComplete: (response) => {
            $options.onComplete?.(response);
            if (isLatestUploadRequest()) {
              setStatus("success");
              setResult((prevResult) => ({
                ...prevResult,
                ok: true,
                status: "success",
              }));
            }
          },
          onError: (e) => {
            $options.onError?.(e);
            if (isLatestUploadRequest()) {
              setError(e);
              setStatus("error");
              setResult((prevResult) => ({
                ...prevResult,
                ok: false,
                status: "error",
              }));
            }
          },
          onAbort: (e) => {
            $options.onAbort?.(e);
            if (isLatestUploadRequest()) {
              setStatus("aborted");
              setResult((prevResult) => ({
                ...prevResult,
                ok: false,
                status: "aborted",
              }));
            }
          },
          onProgress: (args) => {
            $options.onProgress?.(args);
            if (isLatestUploadRequest()) {
              // status is already "uploading"; only sync result while still in progress
              // so a late progress event can't override a paused/terminal state.
              setResult((prev) =>
                prev.status === "idle" || prev.status === "uploading"
                  ? { ok: false, total: args.total, status: "uploading" }
                  : prev,
              );
            }
          },
          onRetry: () => {
            $options.onRetry?.();
            if (isLatestUploadRequest()) {
              setStatus("uploading");
              setResult(INITIAL_UPLOAD_RESULT);
              setError(null);
            }
          },
          onPause: () => {
            $options.onPause?.();
            if (isLatestUploadRequest()) {
              setStatus("paused");
              setResult((prevResult) => ({
                ...prevResult,
                ok: false,
                status: "paused",
              }));
            }
          },
          onResume: () => {
            $options.onResume?.();
            if (isLatestUploadRequest()) {
              setStatus("uploading");
              setResult((prevResult) => ({
                ...prevResult,
                status: "uploading",
              }));
            }
          },
        },
      });

      /**
       * If the current request is not the latest upload request, abort the request.
       */
      if (!isLatestUploadRequest()) {
        uploadActions.abort();
        return;
      }

      setUploadMethod(uploadMethod);

      // Set the previous request abort function to the current abort function.
      prevReqAbortRef.current = uploadActions;

      const uploadResult = await uploadResultPromise;

      /**
       * If the current request is not the latest upload request, do not update the result status.
       */
      if (!isLatestUploadRequest()) {
        return;
      }

      updateUploadResult(uploadResult);
    },
    [url, updateUploadResult],
  );

  /**
   * Executes the upload with error handling and optional re-throwing.
   */
  const uploadSafely = useCallback(
    async (file: File) => {
      const uploadRequestId = latestUploadRequestIdRef.current + 1;

      try {
        await upload(file);
      } catch (e) {
        if (latestUploadRequestIdRef.current !== uploadRequestId) {
          return;
        }

        setError(e as Error);
        setStatus("error");
        setResult({ ...INITIAL_UPLOAD_RESULT, status: "error" });

        const { current: $options } = optionRef;

        const shouldThrow =
          typeof $options.throwOnError === "function"
            ? $options.throwOnError(e)
            : Boolean($options.throwOnError);

        if (shouldThrow) {
          throw e;
        }
      }
    },
    [upload],
  );

  useEffect(() => {
    return () => {
      prevReqAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    optionRef.current?.onUrlChange?.(url);
  }, [url]);


  return {
    upload: uploadSafely,
    /**
     * @deprecated Use `upload(file)` to start a new upload, or `refresh()` to restart from the initial options snapshot.
     */
    retry: uploadSafely,
    result,
    uploadMethod,
    status,
    error,
    abort: () => prevReqAbortRef.current.abort(),
    refresh: () => prevReqAbortRef.current.refresh(),
    pause: () => prevReqAbortRef.current.pause(),
    resume: () => prevReqAbortRef.current.resume(),
  };
}
}
