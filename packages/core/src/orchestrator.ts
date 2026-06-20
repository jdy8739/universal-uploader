import uploadWithStream from "./stream";
import { checkSupportsStreamingUpload } from "./stream/helper";
import { UploadMethod, UploadOptions, UploadResponse } from "./types";
import uploadWithXhrChuncked from "./xhr-chuncked";
import uploadWithFetchStreamChunked from "./stream-chunked";
import { UploadParamsInternal } from "./types";

/**
 * Returns the appropriate uploader function based on the method and URL.
 */
export const getUploader = (
  url: string,
  method: UploadMethod | undefined,
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
