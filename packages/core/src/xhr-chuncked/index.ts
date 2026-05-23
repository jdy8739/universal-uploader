import { UploadParams, UploadResponse, UploadResult } from "../types";
import {
  isSuccessfulHttpStatus,
  calculateChunkRange,
  applyChunkHeaders,
} from "./helper";
import { calculateSizes, calculateChunkProgress } from "../helper";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";

/**
 * Handles file upload as a single request without chunking using XMLHttpRequest.
 * XMLHttpRequest를 사용하여 파일을 청크 분할 없이 단일 요청으로 업로드합니다.
 */
const uploadWithoutChunking = ({
  url,
  file,
  refresh,
  options: { customHeaders = {}, withCredentials, onProgress, onComplete },
}: UploadParams & { refresh: () => void }): UploadResponse => {
  const xhr = new XMLHttpRequest();

  const response = new Promise<UploadResult>((resolve, reject) => {
    xhr.open("POST", url);

    if (withCredentials) {
      xhr.withCredentials = true;
    }

    Object.entries(customHeaders).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
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

    xhr.onerror = () =>
      reject(new Error(`Upload failed with status ${xhr.status}`));
    xhr.onabort = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.send(file);
  });

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: undefined,
      status: "success",
    })),
    actions: {
      abort: () => xhr.abort(),
      refresh: () => {
        xhr.abort();
        refresh();
      },
      pause: () => null,
      resume: () => null,
    },
  };
};

/**
 * Uploads a file by splitting it into sequential chunks using XMLHttpRequest.
 * XMLHttpRequest를 사용하여 파일을 여러 개의 청크로 나누어 순차적으로 업로드합니다.
 */
const uploadWithXhrChuncked = async (
  args: UploadParams & { refresh: () => void },
): Promise<UploadResponse> => {
  const { url, file, refresh, options } = args;
  const {
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
    chunkSize,
    offset: offsetFrom = 0,
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
    chunkSize: chunkSize ?? DEFAULT_STREAM_CHUNK_SIZE,
    fileSize: file.size,
  });

  // If the chunk size is invalid, upload the file as a single request.
  // 청크 크기가 유효하지 않은 경우 단일 요청으로 업로드합니다.
  if (!safeChunkSize || safeChunkSize <= 0) {
    return uploadWithoutChunking(args);
  }

  // If the file size is 0, upload the file as a single request.
  // 파일 크기가 0인 경우 바로 성공 처리합니다.
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
     * Upload the file by chunks.
     * offsetFrom is the offset of the file to upload.
     * startChunkIndex is the start chunk index.
     *
     * 오프셋으로 시작하는 청크부터 업로드합니다.
     * 청크 인덱스가 totalChunks보다 작을 때까지 반복합니다.
     */
    const startChunkIndex = Math.floor(offsetFrom / safeChunkSize);

    for (
      let chunkIndex = startChunkIndex;
      chunkIndex < totalChunks;
      chunkIndex += 1
    ) {
      if (uploadResult.status === "paused") {
        return uploadResult;
      }

      const { start, end } = calculateChunkRange({
        chunkIndex,
        chunkSize: safeChunkSize,
        totalFileSize,
      });

      const uploadPromise = new Promise<Readonly<UploadResult>>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
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
          });

          xhr.onload = () => {
            if (isSuccessfulHttpStatus(xhr.status)) {
              const { isLastChunk, percentage } = calculateChunkProgress({
                loaded: end,
                total: totalFileSize,
              });

              onProgress?.({
                loaded: end,
                total: totalFileSize,
                percentage: totalFileSize === 0 ? 100 : percentage,
              });

              if (isLastChunk) {
                onComplete?.();
              }

              // 성공 이후에 offset 갱신
              options.offset = end;

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
            if (isPaused) return;
            const abortError = new DOMException("Aborted", "AbortError");
            reject(abortError);
          };

          const chunk = file.slice(start, end);
          xhr.send(chunk);

          // 클로저로 밖에서 참조하는 response.actions 객체를 업데이트합니다.
          response.actions.abort = () => xhr.abort();
          response.actions.refresh = () => {
            xhr.abort();
            refresh();
          };
          response.actions.pause = () => {
            isPaused = true;
            xhr.abort();

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
              response.result = uploadChunkedXhr();
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
