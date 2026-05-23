import type { StreamUploaderParams } from "../types";
import { createBuffer } from "../helper";

/**
 * Checks if the browser supports ReadableStream upload with Fetch.
 * 브라우저가 Fetch를 통한 ReadableStream 업로드를 지원하는지 확인합니다.
 */
export const checkSupportsStreamingUpload = (url: string) => {
  try {
    let duplexAccessed = false;

    const hasContentType = new Request(url, {
      body: new ReadableStream(),
      method: "POST",
      get duplex(): "half" {
        duplexAccessed = true;
        return "half";
      },
    }).headers.has("Content-Type");

    return duplexAccessed && !hasContentType;
  } catch {
    return false;
  }
};

/**
 * Initializes a ReadableStream for the provided file.
 * 제공된 파일을 위한 ReadableStream을 초기화합니다.
 */
export const initializeStream = ({
  file,
  chunkSize,
}: StreamUploaderParams): ReadableStream<Uint8Array> => {
  return getStreamUploader({ file, chunkSize });
};
