import { createBuffer } from "../helper";

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
