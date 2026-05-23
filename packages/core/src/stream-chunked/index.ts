import { UploadParams, UploadResponse, UploadResult } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import { calculateSizes, getStreamUploader } from "../helper";
import { calculateChunkRange } from "../xhr-chuncked/helper";

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

    const stream = getStreamUploader({
      file,
      chunkSize: safeChunkSize,
    });

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const { end } = calculateChunkRange({
        chunkIndex,
        safeChunkSize,
        totalFileSize,
      });

      const uploadPromise = new Promise<Readonly<UploadResult>>(
        async (resolve, reject) => {
          const abortController = new AbortController();

          const init: Readonly<RequestInit> = {
            method: "POST",
            body: stream,
            duplex: "half",
            signal: abortController.signal,
            credentials: withCredentials ? "include" : "same-origin",
            headers: {
              "Content-Type": "application/octet-stream",
              ...(customHeaders || {}),
            },
          };

          response.actions.abort = () => abortController.abort();
          response.actions.refresh = () => {
            abortController.abort();
            refresh();
          };
          response.actions.pause = () => null;
          response.actions.resume = () => null;

          const fetchResponse = await fetch(url, init);

          if (fetchResponse.ok) {
            onProgress?.({
              loaded: end,
              total: totalFileSize,
              percentage: (end / totalFileSize) * 100,
            });

            if (end >= totalFileSize) {
              onComplete?.();
            }

            return resolve({
              ok: true,
              total: totalFileSize,
              message: undefined,
              status: "success",
            });
          }

          reject(
            new Error(
              `Chunk upload failed with status ${fetchResponse.status}`,
            ),
          );
        },
      );
      uploadResult = await uploadPromise;
    }
    return uploadResult;
  };

  response.result = uploadChunkedStream();
  return response;
};

export default uploadWithFetchStreamChunked;
