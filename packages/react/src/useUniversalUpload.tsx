import uploadCore from '@usu/core';
import { useCallback, useRef, useState } from 'react';

const INITIAL_UPLOAD_RESULT: Readonly<UploadResult> = {
  ok: false,
  total: 0,
  message: undefined,
  status: 'idle',
};

type UploadActionsWithoutRefresh = Omit<UploadActions, 'refresh'>;

const INITIAL_UPLOAD_ACTIONS: Readonly<UploadActionsWithoutRefresh> = {
  abort: () => null,
};

export default function useUniversalUpload({ url, file, options }: Upload) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResult>(INITIAL_UPLOAD_RESULT);
  const [actions, setActions] = useState<UploadActionsWithoutRefresh>(INITIAL_UPLOAD_ACTIONS);

  const optionRef = useRef(options);
  // eslint-disable-next-line react-hooks/refs
  optionRef.current = options;

  const upload = useCallback(async () => {
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
          setStatus('success');
        },
        onError: (e) => {
          $options.onError?.(e);
          setError(e);
          setStatus('error');
        },
        onAbort: (e) => {
          $options.onAbort?.(e);
          setStatus('aborted');
        },
        onProgress: (args) => {
          $options.onProgress?.(args);
          setStatus('uploading');
        },
        onRetry: () => {
          $options.onRetry?.();
          setStatus('uploading');
          setResult(INITIAL_UPLOAD_RESULT);
          setError(null);
        },
      },
    });

    setActions({
      abort: uploadAbort,
    });

    const uploadResult = await uploadResultPromise;

    setResult(uploadResult);
    setStatus(uploadResult.status);

    if (uploadResult.status === 'error') {
      setError((prevError) => prevError ?? new Error(uploadResult.message || 'Upload failed'));
    }
  }, [url, file]);

  const uploadSafely = useCallback(async () => {
    try {
      await upload();
    } catch (e) {
      setError(e as Error);
      setStatus('error');
      setResult(INITIAL_UPLOAD_RESULT);
    }
  }, [upload]);

  const finalUpload = options.throwOnError ? upload : uploadSafely;

  return {
    upload: finalUpload,
    result,
    status,
    error,
    abort: actions.abort,
    refresh: async () => {
      actions.abort();
      await finalUpload();
    },
  };
}
