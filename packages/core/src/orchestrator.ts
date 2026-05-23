import uploadWithStream from "./stream";
import { checkSupportsStreamingUpload } from "./stream/helper";
import { UploadOptions } from "./types";
import uploadWithXhrChuncked from "./xhr-chuncked";

/**
 * Returns the appropriate uploader function based on the method and URL.
 * 메서드와 URL에 따라 적절한 업로더 함수를 반환합니다.
 */
export const getUploader = (url: string, method: UploadOptions["method"]) => {
  const finalMethod =
    method === "auto" && checkSupportsStreamingUpload(url)
      ? "stream"
      : "xhr chunked";

  switch (finalMethod) {
    case "stream":
      return uploadWithStream;
    case "xhr chunked":
      return uploadWithXhrChuncked;
    default:
      throw new Error(`Unsupported upload method: ${method}`);
  }
};
