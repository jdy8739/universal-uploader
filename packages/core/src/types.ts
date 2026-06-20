/**
 * Represents progress information for an upload.
 */
export interface OnProgressParams {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadMethod = "auto" | "stream" | "stream chunked" | "xhr chunked" | "custom";

/** Signature for an upload strategy function that can be injected into the upload engine. */
export type UploadStrategy = (
  args: UploadParamsInternal,
) => Promise<UploadResponse>;

/**
 * Configuration options for the upload process.
 */
export interface UploadOptions {
  chunkSize?: number;
  offset?: number;
  customHeaders?: Record<string, string>;
  withCredentials?: boolean;
  retryCount?: number;
  retryDelay?: number | ((retryCount: number) => number);
  throwOnError?: boolean | ((error: unknown) => boolean);
  /**
   * Callback on successful completion. Receives the server's Fetch Response for 'stream' and 'stream chunked' (final chunk); undefined for 'xhr chunked' and empty-file uploads (no Fetch Response).
   */
  onComplete?: (response?: Response) => void;
  onProgress?: (args: OnProgressParams) => void;
  onAbort?: (error: DOMException) => void;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
  /** Upload strategy function. Required when using @universal-uploader/core/base. */
  strategy?: UploadStrategy;
}

/**
  * Parameters for starting an upload operation.

 */
export interface UploadParams {
  url: string;
  file: File;
  options: UploadOptions;
}

export interface UploadParamsInternal extends UploadParams {
  refresh: () => void;
  resume: () => void;
}

/**
 * Possible status states of an upload.
 */
export type UploadStatus =
  | "idle"
  | "uploading"
  | "success"
  | "error"
  | "aborted"
  | "paused";

/**
 * The final result of an upload operation.
 */
export interface UploadResult {
  ok: boolean;
  total: number;
  message?: string;
  status: UploadStatus;
}

/**
 * Actions available to control the upload process.
 */
export interface UploadActions {
  abort: () => void;
  refresh: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * The response object returned by the upload initiator.
 */
export interface UploadResponse {
  result: Promise<UploadResult>;
  actions: UploadActions;
}

/**
 * Upload response enriched with the resolved upload method.
 */
export type UploadResponseWithMethod = UploadResponse & {
  uploadMethod: UploadMethod;
};

/**
 * Parameters for stream uploader configuration.
 */
export interface StreamUploaderParams {
  file: File;
  chunkSize: number;
}

declare global {
  interface RequestInit {
    duplex?: "half";
  }
}
