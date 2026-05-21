import uploadCore from '@usu/core';
import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_UPLOAD_RESULT: Readonly<UploadResult> = {
  ok: false,
  total: 0,
  message: undefined,
  status: 'idle',
};

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

  const updateUploadResult = useCallback((uploadResult: UploadResult) => {
    setResult(uploadResult);
    setStatus(uploadResult.status);

    if (uploadResult.status === 'error') {
      setError((prevError) => prevError ?? new Error(uploadResult.message || 'Upload failed'));
    }
  }, []);

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
    result,
    status,
    error,
    abort: () => prevReqAbortRef.current.abort(),
    refresh: async () => {
      prevReqAbortRef.current.abort();
      await uploadSafely();
    },
  };
}
