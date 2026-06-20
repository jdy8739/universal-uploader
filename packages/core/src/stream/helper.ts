import { createBuffer } from "../helper";
import type { OnProgressParams, StreamUploaderParams } from "../types";

/**
 * Checks if the browser supports ReadableStream upload with Fetch.
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
