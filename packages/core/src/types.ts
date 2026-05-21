export interface OnProgressParams {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  method?: 'auto' | 'stream' | 'xhr chunked';
  chunkSize?: number;
  customHeaders?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number | ((retryCount: number) => number);
  throwOnError?: boolean | ((error: unknown) => boolean);
  onComplete?: () => void;
  onProgress?: (args: OnProgressParams) => void;
  onAbort?: (error: DOMException) => void;
  onRetry?: () => void;
  onError?: (error: Error) => void;
}

export interface Upload {
  url: string;
  file: File;
  options: UploadOptions;
}

export interface UploadParams {
  url: string;
  file: File;
  options: UploadOptions;
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'aborted';

export interface UploadResult {
  ok: boolean;
  total: number;
  message?: string;
  status: UploadStatus;
}

export interface UploadActions {
  abort: () => void;
  refresh: () => void;
}

export interface UploadResponse {
  result: Promise<UploadResult>;
  actions: UploadActions;
}
