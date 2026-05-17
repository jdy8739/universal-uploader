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
    onRetry,
    onError,
    retryCount: retryCountArg = 3,
    retryDelay = 1000,
    ...restOptions
  } = {
    ...options,
  };

  const retryCount = retryCountArg;

  const finalOptions = {
    ...restOptions,
    onProgress: ({ loaded, total, percentage }: OnProgressParams) => {
      onProgress?.({ loaded, total, percentage });

      if (percentage === 100) {
        onComplete?.();
      }
    },
  };

  try {
    if (uploadMethod === 'stream') {
      const streamUploadResult = await uploadWithStream({
        url,
        file,
        options: finalOptions,
      });

      return streamUploadResult;
    }

    if (uploadMethod === 'xhr chunked') {
      const xhrChunkedUploadResult = await uploadWithXhrChuncked({
        url,
        file,
        options: finalOptions,
      });

      return xhrChunkedUploadResult;
    }
  } catch (e) {
    onError?.(e as Error);

    if (retryCount > 0) {
      const nextRetryDelay = typeof retryDelay === 'function' ? retryDelay(retryCount) : retryCount;

      setTimeout(() => {
        upload({ url, file, options: { ...options, retryCount: retryCount - 1 } });

        onRetry?.();
      }, nextRetryDelay);
    }
  }

  return {
    ok: false,
    total: 0,
    message: 'Unsupported upload method',
    action: {
      abort: () => null,
      refresh: () => null,
    },
  };
};

export default upload;
