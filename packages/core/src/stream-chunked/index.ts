import { UploadParams, UploadResponse, UploadResult } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import {
  calculateSizes,
  calculateChunkProgress,
  initializeStream,
} from "../helper";
import { calculateChunkRange } from "../xhr-chuncked/helper";
import { createChunkedStream, getStreamChunkHeaders } from "./helper";

const uploadWithFetchStreamChunked = async (
  args: UploadParams & { refresh: () => void },
): Promise<UploadResponse> => {
  const { url, file, refresh, options } = args;
  const {
    chunkSize = DEFAULT_STREAM_CHUNK_SIZE,
    offset: offsetFrom = 0,
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
  } = options;
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

    const startChunkIndex = Math.floor(offsetFrom / safeChunkSize);
    let offset = startChunkIndex * safeChunkSize;

    for (
      let chunkIndex = startChunkIndex;
      chunkIndex < totalChunks;
      chunkIndex += 1
    ) {
      const { end } = calculateChunkRange({
        chunkIndex,
        chunkSize: safeChunkSize,
        totalFileSize,
      });

      const chunkedStream = createChunkedStream({
        file,
        offset,
        chunkSize: safeChunkSize,
      });

      const { abortController, streamInit } = initializeStream({
        body: chunkedStream,
        withCredentials: withCredentials ?? false,
        customHeaders: getStreamChunkHeaders({
          customHeaders: customHeaders || {},
          chunkIndex,
          totalChunks,
          chunkSize: safeChunkSize,
          totalFileSize,
        }),
      });

      response.actions.abort = () => abortController.abort();
      response.actions.refresh = () => {
        abortController.abort();
        refresh();
      };
      response.actions.pause = () => null;
      response.actions.resume = () => null;

      try {
        const fetchResponse = await fetch(url, streamInit);

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

        // 성공 이후에 offset 증가
        offset += safeChunkSize;
        options.offset = offset;

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
