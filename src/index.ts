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

  if (uploadMethod === 'stream') {
    return uploadWithStream({
      url,
      file,
      options,
    });
  }

  if (uploadMethod === 'xhr chunked') {
    return uploadWithXhrChuncked({
      url,
      file,
      options,
    });
  }

  return { ok: false, total: 0, message: 'Unsupported upload method' };
};

export default upload;
