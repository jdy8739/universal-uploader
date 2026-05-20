import uploadWithStream from './stream';
import uploadWithXhrChuncked from './xhr-chuncked';

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
    onAbort?.(e);

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

    const retriedResult: Promise<UploadResult> = originalResult
      .then((uploadResult) => {
        /**
         * fetch resolves for HTTP 4xx/5xx, so stream mode can return { ok: false, status: 'error' }
         * without rejecting. We rethrow here to route it through retry/onError handling.
         *
         * fetch는 HTTP 4xx/5xx에서도 reject하지 않아 stream 모드가 실패 결과를 resolve로 반환할 수 있습니다.
         * 그래서 여기서 다시 throw해서 retry/onError 흐름으로 태웁니다.
         */
        if (!uploadResult.ok && uploadResult.status === 'error') {
          throw new Error(uploadResult.message || 'Upload failed');
        }

        return uploadResult;
      })
      .catch(async (e) => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return handleAbort(e);
        }

        if (retryCount > 0) {
          const { result: retryResult, actions: retryActions } = await retryUpload({
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
      refresh,
    },
  };
};

export default upload;
