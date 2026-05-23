import { CHUNK_HEADER_KEYS } from "../const";
import { createBuffer } from "../helper";

/**
 * Returns stream-chunked headers merged with custom headers.
 * stream-chunked 요청용 헤더와 커스텀 헤더를 병합해 반환합니다.
 */
export const getStreamChunkHeaders = ({
  customHeaders,
  chunkIndex,
  totalChunks,
  chunkSize,
  totalFileSize,
}: {
  customHeaders: Record<string, string>;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  totalFileSize: number;
}) => ({
  [CHUNK_HEADER_KEYS.chunkIndex]: String(chunkIndex),
  [CHUNK_HEADER_KEYS.totalChunks]: String(totalChunks),
  [CHUNK_HEADER_KEYS.chunkSize]: String(chunkSize),
  [CHUNK_HEADER_KEYS.fileSize]: String(totalFileSize),
  ...customHeaders,
});

/**
 * Returns a ReadableStream that yields a single chunk of the file at the given offset.
 * 지정된 오프셋의 파일 청크를 하나만 내보내는 ReadableStream을 반환합니다.
 */
export const createChunkedStream = ({
  file,
  offset,
  chunkSize,
}: {
  file: File;
  offset: number;
  chunkSize: number;
}) => {
  const chunkedStream = new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      if (offset >= file.size) {
        controller.close();
        return;
      }

      const chunkBuffer = await createBuffer({
        file,
        offset,
        chunkSize,
      });

      controller.enqueue(chunkBuffer);
      controller.close();
    },
  });

  return chunkedStream;
};
