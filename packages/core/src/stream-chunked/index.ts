import { UploadParamsInternal, UploadResponse, UploadResult } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import {
  calculateSizes,
  calculateChunkProgress,
  calculateResumePosition,
  getCustomHeaders,
  initializeStream,
} from "../helper";
import { calculateChunkEnd } from "../xhr-chuncked/helper";
import { createChunkedStream } from "./helper";

const uploadWithFetchStreamChunked = async (
  args: UploadParamsInternal,
): Promise<UploadResponse> => {
  const { url, file, refresh, options } = args;

  const {
    chunkSize = DEFAULT_STREAM_CHUNK_SIZE,
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
    onPause,
    onResume,
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

  let isResuming = false;

  const uploadChunkedStream = async (): Promise<Readonly<UploadResult>> => {
    isResuming = false;

    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
      status: "uploading",
    };

    /**
     * Resume from persisted offset by deriving chunk index + stream offset.
     * 저장된 offset으로부터 재개 시작 청크 인덱스와 오프셋을 계산합니다.
     */
    const { startChunkIndex, startOffset } = calculateResumePosition({
      offset: options.offset,
      chunkSize: safeChunkSize,
    });

    let offset = startOffset;

    for (
      let chunkIndex = startChunkIndex;
      chunkIndex < totalChunks;
      chunkIndex += 1
    ) {
      if (uploadResult.status === "paused") {
        return uploadResult;
      }

      const end = calculateChunkEnd({
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
        customHeaders: getCustomHeaders({
          customHeaders,
          chunkIndex,
          totalChunks,
          chunkSize: safeChunkSize,
          totalFileSize,
          fileName: file.name,
        }),
      });

      /**
       * Whether the chunk is paused.
       * 청크가 일시정지된 경우 명시적으로 abort 에러를 던지지 않기 위한 플래그 값.
       */
      let isPaused = false;

      response.actions.abort = () => abortController.abort();
      response.actions.refresh = () => {
        abortController.abort();
        refresh();
      };
      response.actions.pause = () => {
        isPaused = true;

        abortController.abort();
        onPause?.();

        uploadResult = {
          ok: false,
          total: totalFileSize,
          message: undefined,
          status: "paused",
        };
        return;
      };
      response.actions.resume = () => {
        if (uploadResult.status === "paused" && !isResuming) {
          isResuming = true;

          response.result = uploadChunkedStream();
          onResume?.();
        }
      };

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

        // 성공 이후에 offset 갱신
        offset = end;
        options.offset = end;

        uploadResult = {
          ok: true,
          total: totalFileSize,
          message: undefined,
          status: "success",
        };
      } catch (e) {
        if (isPaused && e instanceof DOMException && e.name === "AbortError") {
          // Do nothing
        } else {
          throw e;
        }
      }
    }

    return uploadResult;
  };

  response.result = uploadChunkedStream();
  return response;
};

export default uploadWithFetchStreamChunked;
