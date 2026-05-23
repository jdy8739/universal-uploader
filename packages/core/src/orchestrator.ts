import uploadWithStream from "./stream";
import { checkSupportsStreamingUpload } from "./stream/helper";
import { UploadOptions } from "./types";
import uploadWithXhrChuncked from "./xhr-chuncked";
import uploadWithFetchStreamChunked from "./stream-chunked";

/**
 * Returns the appropriate uploader function based on the method and URL.
 * 메서드와 URL에 따라 적절한 업로더 함수를 반환합니다.
 */
export const getUploader = (url: string, method: UploadOptions["method"]) => {
  const finalMethod =
    method === "auto" && checkSupportsStreamingUpload(url) ? "stream" : method;

  switch (finalMethod) {
    case "stream":
      return uploadWithStream;
    case "stream chunked":
      return uploadWithFetchStreamChunked;
    case "xhr chunked":
    case "auto":
      return uploadWithXhrChuncked;
    default:
      throw new Error(`Unsupported upload method: ${method}`);
  }
};
