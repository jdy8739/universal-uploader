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

declare interface UploadParams {
  url: string;
  file: File;
  options: UploadOptions;
}

declare interface RequestInit {
  duplex?: 'half';
  get duplex(): 'half';
}

declare interface UploadResult {
  ok: boolean;
  total: number;
  message?: string;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'aborted';
}

declare interface UploadActions {
  abort: () => void;
  refresh: () => void;
}

declare interface UploadResponse {
  result: Promise<UploadResult>;
  actions: UploadActions;
}
