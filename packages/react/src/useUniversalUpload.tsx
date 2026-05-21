import uploadCore, { Upload, UploadResult, UploadStatus, UploadActions } from '@usu/core';
import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_UPLOAD_RESULT: Readonly<UploadResult> = {
  ok: false,
  total: 0,
  message: undefined,
  status: 'idle',
};

/**
 * A custom React hook for handling universal file uploads with streaming support and fallbacks.
 * 스트리밍 지원 및 폴백 기능을 갖춘 범용 파일 업로드를 처리하기 위한 커스텀 React 훅입니다.
 */
export default function useUniversalUpload({ url, file, options }: Upload) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResult>(INITIAL_UPLOAD_RESULT);

  /**
   * The previous request abort function.
   * 이전의 요청 중단 함수입니다.
   */
  const prevReqAbortRef = useRef<UploadActions>({ abort: () => null, refresh: () => null });

  /**
   * The latest upload request ID.
   * 가장 최근의 업로드 요청 ID입니다.
   */
  const latestUploadRequestIdRef = useRef(0);

  /**
   * The options object.
   * deps에 포함되지 않는 옵션 객체입니다.
   */
  const optionRef = useRef(options);
  // eslint-disable-next-line react-hooks/refs
  optionRef.current = options;

  /**
   * Updates the upload result and status state.
   * 업로드 결과 및 상태 스테이트를 업데이트합니다.
   */
  const updateUploadResult = useCallback((uploadResult: UploadResult) => {
    setResult(uploadResult);
    setStatus(uploadResult.status);

    if (uploadResult.status === 'error') {
      setError((prevError) => prevError ?? new Error(uploadResult.message || 'Upload failed'));
    }
  }, []);

  /**
   * Core upload logic that manages request lifecycle and status updates.
   * 요청 수명 주기 및 상태 업데이트를 관리하는 핵심 업로드 로직입니다.
   */
  const upload = useCallback(async () => {
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
    const isLatestUploadRequest = () => latestUploadRequestIdRef.current === latestUploadRequestId;

    /**
     * If the previous request is still in progress, abort it.
     * 이전의 요청이 아직 진행 중이라면 중단합니다.
     */
    prevReqAbortRef.current.abort();

    /**
     * Reset external progress UI before a new upload starts.
     * 새 업로드가 시작되기 전에 외부 progress UI를 초기화합니다.
     */
    optionRef.current?.onProgress?.({ loaded: 0, total: 0, percentage: 0 });

    setStatus('uploading');
    setError(null);
    setResult(INITIAL_UPLOAD_RESULT);

    const { current: $options } = optionRef;

    const { result: uploadResultPromise, actions: uploadActions } = await uploadCore({
      url,
      file,
      options: {
        ...$options,
        onComplete: () => {
          $options.onComplete?.();
          if (isLatestUploadRequest()) {
            setStatus('success');
            setResult((prevResult) => ({ ...prevResult, ok: true, status: 'success' }));
          }
        },
        onError: (e) => {
          $options.onError?.(e);
          if (isLatestUploadRequest()) {
            setError(e);
            setStatus('error');
            setResult((prevResult) => ({ ...prevResult, ok: false, status: 'error' }));
          }
        },
        onAbort: (e) => {
          $options.onAbort?.(e);
          if (isLatestUploadRequest()) {
            setStatus('aborted');
            setResult((prevResult) => ({ ...prevResult, ok: false, status: 'aborted' }));
          }
        },
        onProgress: (args) => {
          $options.onProgress?.(args);
          if (isLatestUploadRequest()) {
            setStatus('uploading');
            setResult({ ok: false, total: args.percentage, status: 'uploading' });
          }
        },
        onRetry: () => {
          $options.onRetry?.();
          if (isLatestUploadRequest()) {
            setStatus('uploading');
            setResult(INITIAL_UPLOAD_RESULT);
            setError(null);
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
  }, [url, file, updateUploadResult]);

  /**
   * Executes the upload with error handling and optional re-throwing.
   * 에러 핸들링 및 선택적 re-throw 기능을 포함하여 업로드를 실행합니다.
   */
  const uploadSafely = useCallback(async () => {
    try {
      await upload();
    } catch (e) {
      setError(e as Error);
      setStatus('error');
      setResult({ ...INITIAL_UPLOAD_RESULT, status: 'error' });

      const { current: $options } = optionRef;

      const shouldThrow =
        typeof $options.throwOnError === 'function'
          ? $options.throwOnError(e)
          : Boolean($options.throwOnError);

      if (shouldThrow) {
        throw e;
      }
    }
  }, [upload]);

  useEffect(() => {
    return () => {
      prevReqAbortRef.current.abort();
    };
  }, []);

  return {
    upload: uploadSafely,
    /**
     * Alias for upload — restarts upload after abort, error, or success.
     * upload의 별칭 — 중단, 실패, 성공 이후 업로드를 다시 시작할 때 사용합니다.
     */
    retry: uploadSafely,
    result,
    status,
    error,
    abort: () => prevReqAbortRef.current.abort(),
  };
}
