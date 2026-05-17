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

declare interface UploadResponse {
  ok: boolean;
  total: number;
  message?: string;
  action: { abort: () => void; refresh: () => void };
}
