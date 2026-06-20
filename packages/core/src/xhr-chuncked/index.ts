import {
  UploadParams,
  UploadParamsInternal,
  UploadResponse,
  UploadResult,
} from "../types";
import {
  isSuccessfulHttpStatus,
  calculateChunkEnd,
  applyChunkHeaders,
} from "./helper";
import {
  calculateSizes,
  calculateChunkProgress,
  calculateResumePosition,
} from "../helper";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";

/**
 * Handles file upload as a single request without chunking using XMLHttpRequest.
 */
const uploadWithoutChunking = ({
  url,
  file,
  refresh,
  resume,
  options: {
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
    onPause,
    onResume,
  },
}: UploadParamsInternal): UploadResponse => {
  const xhr = new XMLHttpRequest();
  let isPaused = false;

  const response = new Promise<UploadResult>((resolve, reject) => {
    xhr.open("POST", url);

    if (withCredentials) {
      xhr.withCredentials = true;
    }

    applyChunkHeaders({
      xhr,
      customHeaders,
      fileName: file.name,
    });

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        const total = e.total || file.size;
        const percentage = total === 0 ? 100 : (e.loaded / total) * 100;

        onProgress({
          loaded: e.loaded,
          total,
          percentage,
        });
      };
    }

    xhr.onload = () => {
      if (isSuccessfulHttpStatus(xhr.status)) {
        onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
        onComplete?.();

        resolve({
          ok: true,
          total: file.size,
          message: undefined,
          status: "success",
        });

        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onabort = () => {
      if (isPaused) {
        resolve({
          ok: false,
          total: file.size,
          message: undefined,
          status: "paused",
        });
        return;
      }

      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.onerror = () =>
      reject(new Error(`Upload failed with status ${xhr.status}`));

    xhr.send(file);
  });

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: res.message,
      status: res.status,
    })),
    actions: {
      abort: () => {
        isPaused = false;

        xhr.abort();
      },
      refresh: () => {
        isPaused = false;

        xhr.abort();
        refresh();
      },
      pause: () => {
        // Actually pause means abort the upload because it is not chunked to catch the chunk upload progress.
        isPaused = true;
        xhr.abort();
        onPause?.();
      },
      resume: () => {
        if (!isPaused) {
          return;
        }

        isPaused = false;

        resume();
        onResume?.();
      },
    },
  };
};

/**
 * Uploads a file by splitting it into sequential chunks using XMLHttpRequest.
 */
const uploadWithXhrChuncked = async (
  args: UploadParamsInternal,
): Promise<UploadResponse> => {
  const { url, file, refresh, options } = args;

  const {
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
    onPause,
    onResume,
    chunkSize,
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

  // If the chunk size is invalid, upload the file as a single request.
  if (typeof chunkSize === "number" && chunkSize <= 0) {
    return uploadWithoutChunking(args);
  }

  const { safeChunkSize, totalFileSize, totalChunks } = calculateSizes({
    chunkSize: chunkSize ?? DEFAULT_STREAM_CHUNK_SIZE,
    fileSize: file.size,
  });

  // If the file size is 0, upload the file as a single request.
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

  const uploadChunkedXhr = async (): Promise<Readonly<UploadResult>> => {
    isResuming = false;

    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
      status: "uploading",
    };

    /**
     * Upload the file by chunks starting from the persisted resume position.
     * options.offset is converted to startChunkIndex/startOffset for resume.
     *
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

      const chunkEnd = calculateChunkEnd({
        chunkIndex,
        chunkSize: safeChunkSize,
        totalFileSize,
      });

      const uploadPromise = new Promise<Readonly<UploadResult>>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();

          /**
           * Whether the chunk is paused.
           */
          let isPaused = false;

          if (withCredentials) {
            xhr.withCredentials = true;
          }

          xhr.open("POST", url);

          applyChunkHeaders({
            xhr,
            customHeaders,
            chunkIndex,
            totalChunks,
            safeChunkSize,
            totalFileSize,
            fileName: file.name,
          });

          xhr.onload = () => {
            if (isSuccessfulHttpStatus(xhr.status)) {
              const { isLastChunk, percentage } = calculateChunkProgress({
                loaded: chunkEnd,
                total: totalFileSize,
              });

              onProgress?.({
                loaded: chunkEnd,
                total: totalFileSize,
                percentage: totalFileSize === 0 ? 100 : percentage,
              });

              if (isLastChunk) {
                onComplete?.();
              }

              offset = chunkEnd;
              options.offset = chunkEnd;

              return resolve({
                ok: true,
                total: totalFileSize,
                message: undefined,
                status: isLastChunk ? "success" : "uploading",
              });
            }

            reject(new Error(`Chunk upload failed with status ${xhr.status}`));
          };

          xhr.onerror = () =>
            reject(new Error(`Upload failed with status ${xhr.status}`));
          xhr.onabort = () => {
            // If the chunk is paused, do not reject the promise.
            if (isPaused) {
              return;
            }

            reject(new DOMException("Aborted", "AbortError"));
          };

          const chunk = file.slice(offset, chunkEnd);
          xhr.send(chunk);

          response.actions.abort = () => xhr.abort();
          response.actions.refresh = () => {
            xhr.abort();
            refresh();
          };
          response.actions.pause = () => {
            isPaused = true;

            xhr.abort();
            onPause?.();

            resolve({
              ok: false,
              total: totalFileSize,
              message: undefined,
              status: "paused",
            });
          };
          response.actions.resume = () => {
            if (uploadResult.status === "paused" && !isResuming) {
              isResuming = true;

              // Resume the upload based on the options.offset in the closure. No separate resume function is used because it restarts the upload itself.
              response.result = uploadChunkedXhr();
              onResume?.();
            }
          };
        },
      );
      uploadResult = await uploadPromise;
    }
    return uploadResult;
  };

  response.result = uploadChunkedXhr();
  return response;
};

export default uploadWithXhrChuncked;
