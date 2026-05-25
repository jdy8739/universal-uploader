import uploadWithStream from "./stream";
import { checkSupportsStreamingUpload } from "./stream/helper";
import { UploadMethod, UploadOptions, UploadResponse } from "./types";
import uploadWithXhrChuncked from "./xhr-chuncked";
import uploadWithFetchStreamChunked from "./stream-chunked";
import { UploadParamsInternal } from "./types";

/**
 * Returns the appropriate uploader function based on the method and URL.
 * 메서드와 URL에 따라 적절한 업로더 함수를 반환합니다.
 */
export const getUploader = (
  url: string,
  method: UploadOptions["method"],
): {
  method: Exclude<UploadMethod, "auto">;
  upload: (args: UploadParamsInternal) => Promise<UploadResponse>;
} => {
  const requestedMethod = method ?? "auto";
  switch (requestedMethod) {
    case "auto":
      return checkSupportsStreamingUpload(url)
        ? { method: "stream", upload: uploadWithStream }
        : { method: "xhr chunked", upload: uploadWithXhrChuncked };
    case "stream":
      return { method: "stream", upload: uploadWithStream };
    case "stream chunked":
      return { method: "stream chunked", upload: uploadWithFetchStreamChunked };
    case "xhr chunked":
      return { method: "xhr chunked", upload: uploadWithXhrChuncked };
    default:
      throw new Error(`Unsupported upload method: ${requestedMethod}`);
  }
};
