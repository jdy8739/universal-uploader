import uploadCore from '@usu/core';
import { useCallback, useRef, useState } from 'react';

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

  const prevReqAbortRef = useRef<() => void>(() => null);
  const requestIdRef = useRef(0);
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
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const isLatestUploadRequest = () => requestIdRef.current === requestId;

    /**
     * If the previous request is still in progress, abort it.
     * 이전의 요청이 아직 진행 중이라면 중단합니다.
     */
    prevReqAbortRef.current();

    setStatus('uploading');
    setError(null);
    setResult(INITIAL_UPLOAD_RESULT);

    const { current: $options } = optionRef;

    const {
      result: uploadResultPromise,
      actions: { abort: uploadAbort },
    } = await uploadCore({
      url,
      file,
      options: {
        ...$options,
        onComplete: () => {
          $options.onComplete?.();
          if (isLatestUploadRequest()) {
            setStatus('success');
          }
        },
        onError: (e) => {
          $options.onError?.(e);
          if (isLatestUploadRequest()) {
            setError(e);
            setStatus('error');
          }
        },
        onAbort: (e) => {
          $options.onAbort?.(e);
          if (isLatestUploadRequest()) {
            setStatus('aborted');
          }
        },
        onProgress: (args) => {
          $options.onProgress?.(args);
          if (isLatestUploadRequest()) {
            setStatus('uploading');
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

    if (!isLatestUploadRequest()) {
      uploadAbort();
      return;
    }

    prevReqAbortRef.current = uploadAbort;

    const uploadResult = await uploadResultPromise;

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

  return {
    upload: uploadSafely,
    result,
    status,
    error,
    abort: () => prevReqAbortRef.current(),
    refresh: async () => {
      prevReqAbortRef.current();
      await uploadSafely();
    },
  };
}
