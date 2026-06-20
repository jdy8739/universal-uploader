import { createBuffer } from "../helper";

/**
 * Returns a ReadableStream that yields a single chunk of the file at the given offset.
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
