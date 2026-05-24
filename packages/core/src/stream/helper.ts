import { createBuffer } from "../helper";
import type { OnProgressParams, StreamUploaderParams } from "../types";

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

/**
 * Creates a TransformStream that tracks the progress of the data flowing through it.
 * 데이터 흐름을 추적하여 진행률을 계산하는 TransformStream을 생성합니다.
 */
export const createProgressStream = ({
  totalFileSize,
  onProgress,
}: {
  totalFileSize: number;
  onProgress?: (args: OnProgressParams) => void;
}) => {
  let bytesRead = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    // Calculate progress by obtaining chunks from the readable stream piped through. No separate data processing is performed.
    // 각 리더블 스트림에 파이프를 걸어 청크를 얻어 진행율을 계산합니다. 별도의 chunk 데이터 가공은 하지 않습니다.
    transform: (chunk, controller) => {
      bytesRead += chunk.byteLength;

      onProgress?.({
        loaded: bytesRead,
        percentage: (bytesRead / totalFileSize) * 100,
        total: totalFileSize,
      });

      controller.enqueue(chunk);
    },
  });
};

/**
 * Creates upload request body with optional progress tracking.
 * 진행률 추적 여부에 따라 업로드 요청 바디를 생성합니다.
 */
export const createUploadBody = ({
  stream,
  totalFileSize,
  onProgress,
}: {
  stream: ReadableStream<Uint8Array>;
  totalFileSize: number;
  onProgress?: (args: OnProgressParams) => void;
}) =>
  onProgress
    ? stream.pipeThrough(
        createProgressStream({
          totalFileSize,
          onProgress,
        }),
      )
    : stream;
