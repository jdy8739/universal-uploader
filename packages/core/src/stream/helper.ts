import { createBuffer } from "../helper";
import type { StreamUploaderParams } from "../types";

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
 * Returns a ReadableStream that yields chunks of the file.
 * 파일의 청크를 순차적으로 내보내는 ReadableStream을 반환합니다.
 */
export const getStreamUploader = ({
  file,
  chunkSize,
}: StreamUploaderParams) => {
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (offset >= file.size) {
        controller.close();
        return;
      }

      const chunkBuffer = await createBuffer({ file, offset, chunkSize });
      controller.enqueue(chunkBuffer);
      offset += chunkSize;

      if (offset >= file.size) {
        controller.close();
      }
    },
  });
};
