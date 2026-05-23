import { UploadParams, UploadResponse, UploadResult } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import {
  calculateSizes,
  createBuffer,
  calculateChunkProgress,
} from "../helper";
import { calculateChunkRange } from "../xhr-chuncked/helper";
import { getStreamChunkHeaders } from "./helper";

const uploadWithFetchStreamChunked = async ({
  url,
  file,
  refresh,
  options: {
    chunkSize = DEFAULT_STREAM_CHUNK_SIZE,
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
  },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const response: UploadResponse = {
    result: Promise.resolve({
      ok: false,
      total: 0,
      message: undefined,
      status: "idle",
    }),
    actions: {
      abort: () => null,
      refresh: () => null,
      pause: () => null,
      resume: () => null,
    },
  };

  const { safeChunkSize, totalFileSize, totalChunks } = calculateSizes({
    chunkSize,
    fileSize: file.size,
  });

  if (totalFileSize === 0) {
    onProgress?.({ loaded: 0, total: 0, percentage: 100 });
    onComplete?.();

    response.result = Promise.resolve({
      ok: true,
      total: 0,
      message: undefined,
      status: "success",
    });

    return response;
  }

  const uploadChunkedStream = async (): Promise<Readonly<UploadResult>> => {
    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
      status: "uploading",
    };

    let offset = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const { end } = calculateChunkRange({
        chunkIndex,
        chunkSize: safeChunkSize,
        totalFileSize,
      });

      const chunkedStream = new ReadableStream<Uint8Array>({
        pull: async (controller) => {
          if (offset >= file.size) {
            controller.close();
            return;
          }

          const chunkBuffer = await createBuffer({
            file,
            offset,
            chunkSize: safeChunkSize,
          });

          controller.enqueue(chunkBuffer);
          offset += safeChunkSize;
          controller.close();
        },
      });

      const abortController = new AbortController();

      const init: Readonly<RequestInit> = {
        method: "POST",
        body: chunkedStream,
        duplex: "half",
        signal: abortController.signal,
        credentials: withCredentials ? "include" : "same-origin",
        headers: {
          "Content-Type": "application/octet-stream",
          ...getStreamChunkHeaders({
            customHeaders: customHeaders || {},
            chunkIndex,
            totalChunks,
            chunkSize: safeChunkSize,
            totalFileSize,
          }),
        },
      };

      response.actions.abort = () => abortController.abort();
      response.actions.refresh = () => {
        abortController.abort();
        refresh();
      };
      response.actions.pause = () => null;
      response.actions.resume = () => null;

      try {
        const fetchResponse = await fetch(url, init);

        if (!fetchResponse.ok || fetchResponse.status >= 300) {
          throw new Error(
            `Chunk upload failed with status ${fetchResponse.status}`,
          );
        }

        const { isLastChunk, percentage } = calculateChunkProgress({
          loaded: end,
          total: totalFileSize,
        });

        onProgress?.({
          loaded: end,
          total: totalFileSize,
          percentage,
        });

        if (isLastChunk) {
          onComplete?.();
        }

        uploadResult = {
          ok: true,
          total: totalFileSize,
          message: undefined,
          status: "success",
        };
      } catch (e) {
        throw e;
      }
    }

    return uploadResult;
  };

  response.result = uploadChunkedStream();
  return response;
};

export default uploadWithFetchStreamChunked;
