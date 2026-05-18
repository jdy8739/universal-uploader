import uploadWithStream from './stream';
import uploadWithXhrChuncked from './xhr-chuncked';

interface UploadOptionsExternal extends UploadOptions {
  method?: 'stream' | 'xhr chunked' | 'auto';
  onComplete?: () => void;
  onAbort?: () => void;
  onRetry?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number | ((retryCount: number) => number);
  throwOnError?: boolean | ((e: unknown) => boolean);
}

interface Upload {
  url: string;
  file: File;
  options: UploadOptionsExternal;
}

const checkSupportsStreamingUpload = (url: string) => {
  let duplexAccessed = false;

  const hasContentType = new Request(url, {
    body: new ReadableStream(),
    method: 'POST',
    get duplex(): 'half' {
      duplexAccessed = true;
      return 'half';
    },
  }).headers.has('Content-Type');

  return duplexAccessed && !hasContentType;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const upload = async ({
  url,
  file,
  options: { method = 'auto', ...options },
}: Upload): Promise<UploadResponse> => {
  const uploadMethod =
    // eslint-disable-next-line no-nested-ternary
    method === 'auto' ? (checkSupportsStreamingUpload(url) ? 'stream' : 'xhr chunked') : method;

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

  const shouldThrowError = (e: unknown): boolean => {
    if (typeof throwOnError === 'function') {
      return throwOnError(e);
    }

    return Boolean(throwOnError);
  };

  const handleAbort = (e: DOMException): UploadResult => {
    onAbort?.();

    if (shouldThrowError(e)) {
      throw e;
    }

    return { ok: false, total: 0, message: 'Aborted by user action', status: 'aborted' };
  };

  const handleError = (e: Error): UploadResult => {
    onError?.(e);

    if (shouldThrowError(e)) {
      throw e;
    }

    return { ok: false, total: 0, message: e.message, status: 'error' };
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

  const retryUpload = async (uploadArgs: Upload): Promise<UploadResponse> => {
    const nextRetryDelay = typeof retryDelay === 'function' ? retryDelay(retryCount) : retryDelay;

    await wait(nextRetryDelay);

    onRetry?.();

    return upload(uploadArgs);
  };

  const wrapPromiseErrorHandler = async (
    uploadResponse: UploadResponse,
  ): Promise<UploadResponse> => {
    const { result: originalResult, actions: originalActions } = uploadResponse;

    const retriedActions: UploadActions = { ...originalActions };

    const retriedResult: Promise<UploadResult> = originalResult.catch(async (e) => {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return handleAbort(e);
      }

      if (retryCount > 0) {
        const { result: retryResult, actions: retryActions } = await retryUpload({
          url,
          file,
          options: { ...options, retryCount: retryCount - 1 },
        });

        Object.assign(retriedActions, retryActions);
        return retryResult;
      }

      return handleError(e);
    });

    return { result: Promise.resolve(retriedResult), actions: retriedActions };
  };

  try {
    if (uploadMethod === 'stream') {
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

    if (uploadMethod === 'xhr chunked') {
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
      message: 'Unsupported upload method',
      status: 'error',
    }),
    actions: {
      abort: () => null,
      refresh: () => upload({ url, file, options }),
    },
  };
};

export default upload;
