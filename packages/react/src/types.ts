import { UploadOptions, UploadMethod as UploadMethodType } from "@universal-uploader/core";

/**
 * Configuration options for the React hook.
 */
export interface UploadHookOptions extends UploadOptions {
  onUrlChange?: (url: string) => void;
}

export type UploadMethod = UploadMethodType;
