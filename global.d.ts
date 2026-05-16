declare interface UploadOptions {
  chunkSize?: number;
  customHeaders?: Record<string, string>;
  onProgress?: ({
    loaded,
    total,
    percentage,
  }: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
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
}
