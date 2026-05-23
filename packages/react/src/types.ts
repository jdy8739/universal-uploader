import { UploadOptions } from "@usu/core";

/**
 * Configuration options for the React hook.
 * React 훅을 위한 구성 옵션입니다.
 */
export interface UploadHookOptions extends UploadOptions {
  /** Callback when the target URL changes. / URL이 변경될 때 호출되는 콜백. */
  onUrlChange?: (url: string) => void;
  /** Callback when the file to be uploaded changes. / 업로드할 파일이 변경될 때 호출되는 콜백. */
  onFileChange?: (file: File) => void;
  /** Callback when the upload method changes. / 업로드 방식이 변경될 때 호출되는 콜백. */
  onMethodChange?: (method: UploadOptions["method"]) => void;
}
