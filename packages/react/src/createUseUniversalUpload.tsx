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
 * 요청의 실제 actions가 준비되기 전에 사용하는 빈 actions입니다.
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
 * 주입된 core 업로드 엔진으로 React 업로드 훅을 생성합니다.
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
   * 이전의 요청 중단 함수입니다.
   */
  const prevReqAbortRef = useRef<UploadActions>(NOOP_ACTIONS);

  /**
   * The latest upload request ID.
   * 가장 최근의 업로드 요청 ID입니다.
   */
  const latestUploadRequestIdRef = useRef(0);

  /**
   * The options object.
   * deps에 포함되지 않는 옵션 객체입니다.
   */
  const optionRef = useRef<UploadHookOptions>(
    options ?? FALLBACK_UPLOAD_OPTIONS,
  );
  // eslint-disable-next-line react-hooks/refs
  optionRef.current = options ?? FALLBACK_UPLOAD_OPTIONS;

  /**
   * Updates the upload result and status state.
   * 업로드 결과 및 상태 스테이트를 업데이트합니다.
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
   * 요청 수명 주기 및 상태 업데이트를 관리하는 핵심 업로드 로직입니다.
   */
  const upload = useCallback(
    async (file: File) => {
      /**
       * Increment the latest upload request ID.
       * 가장 최근의 업로드 요청 ID를 증가시킵니다.
       *
       * Set the latest upload request ID to the current value.
       * 가장 최근의 업로드 요청 ID를 현재 값으로 설정합니다.
       *
       * Check if the current request is the latest upload request.
       * 현재 요청이 가장 최근의 업로드 요청인지 확인합니다.
       */
      latestUploadRequestIdRef.current += 1;
      const latestUploadRequestId = latestUploadRequestIdRef.current;
      const isLatestUploadRequest = () =>
        latestUploadRequestIdRef.current === latestUploadRequestId;

      /**
       * If the previous request is still in progress, abort it, then reset to no-op
       * so controls during the await gap don't hit the aborted request's actions.
       * 이전 요청을 중단한 뒤 no-op으로 리셋해, await 사이의 컨트롤 호출이
       * 이미 중단된 요청의 actions로 새지 않도록 합니다.
       */
      prevReqAbortRef.current.abort();
      prevReqAbortRef.current = NOOP_ACTIONS;

      /**
       * Reset external progress UI before a new upload starts.
       * 새 업로드가 시작되기 전에 외부 progress UI를 초기화합니다.
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
              // status는 이미 "uploading"이므로 진행 중일 때만 result를 동기화해,
              // 늦게 온 progress가 일시정지/종료 상태를 덮어쓰지 않게 합니다.
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
       * 현재 요청이 가장 최근의 업로드 요청이 아니라면 요청을 중단합니다.
       */
      if (!isLatestUploadRequest()) {
        uploadActions.abort();
        return;
      }

      setUploadMethod(uploadMethod);

      // Set the previous request abort function to the current abort function.
      // 이전의 요청 중단 함수를 현재의 요청 중단 함수로 설정합니다.
      prevReqAbortRef.current = uploadActions;

      const uploadResult = await uploadResultPromise;

      /**
       * If the current request is not the latest upload request, do not update the result status.
       * 현재 요청이 가장 최근의 업로드 요청이 아니라면 결과 상태 업데이트를 하지 않고 반환합니다.
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
   * 에러 핸들링 및 선택적 re-throw 기능을 포함하여 업로드를 실행합니다.
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
     * @deprecated 새 업로드는 `upload(file)`, 초기 옵션 스냅샷 재시작은 `refresh()`를 사용하세요.
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
