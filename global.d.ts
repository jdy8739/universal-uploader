declare interface OnProgressParams {
  loaded: number;
  total: number;
  percentage: number;
}

declare interface UploadOptions {
  chunkSize?: number;
  customHeaders?: Record<string, string>;
  onProgress?: (args: OnProgressParams) => void;
  onAbort?: (e: unknown) => void;
}

declare interface UploadOptionsExternal extends UploadOptions {
  method?: 'stream' | 'xhr chunked' | 'auto';
  onComplete?: () => void;
  onRetry?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number | ((retryCount: number) => number);
  throwOnError?: boolean | ((e: unknown) => boolean);
}

declare interface Upload {
  url: string;
  file: File;
  options: UploadOptionsExternal;
}

declare interface RequestInit {
  duplex?: 'half';
  get duplex(): 'half';
}

declare type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'aborted';

declare interface UploadResult {
  ok: boolean;
  total: number;
  message?: string;
  status: UploadStatus;
}

declare interface UploadActions {
  abort: () => void;
  refresh: () => void;
}

declare interface UploadResponse {
  result: Promise<UploadResult>;
  actions: UploadActions;
}
