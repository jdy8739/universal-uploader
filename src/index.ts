interface UploadOptions {
  method?: 'stream' | 'xhr chunked' | 'auto';
  chunkSize?: number;
  onProgress?: (progress: number) => void;
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
  options: UploadOptions;
}

const upload = async ({
  url,
  file,
  options = {
    method: 'auto',
    chunkSize: 1024,
  },
}: Upload) => {
  console.log(url, file, options);
};

export default upload;
