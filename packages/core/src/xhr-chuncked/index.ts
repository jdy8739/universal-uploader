import { UploadParams, UploadResponse, UploadResult } from "../types";
import {
  isSuccessfulHttpStatus,
  getChunkUploadMeta,
  getChunkRange,
  applyChunkHeaders,
} from "./helper";

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

    xhr.onerror = (e) => reject(e);
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
  const {
    url,
    file,
    refresh,
    options: {
      customHeaders = {},
      withCredentials,
      onProgress,
      onComplete,
      chunkSize,
    },
  } = args;

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

  if (!chunkSize || chunkSize <= 0) {
    return uploadWithoutChunking(args);
  }

  const { safeChunkSize, totalFileSize, totalChunks } = getChunkUploadMeta({
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

  const chunkUpload = async (): Promise<Readonly<UploadResult>> => {
    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
      status: "uploading",
    };

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const { start, end } = getChunkRange({
        chunkIndex,
        safeChunkSize,
        totalFileSize,
      });

      const uploadPromise = new Promise<Readonly<UploadResult>>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
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
              const isLastChunk = end >= totalFileSize;
              const percentage = isLastChunk
                ? 100
                : (end / totalFileSize) * 100;

              onProgress?.({
                loaded: end,
                total: totalFileSize,
                percentage: totalFileSize === 0 ? 100 : percentage,
              });

              if (isLastChunk) {
                onComplete?.();
              }

              resolve({
                ok: true,
                total: totalFileSize,
                message: undefined,
                status: isLastChunk ? "success" : "uploading",
              });
              return;
            }
            reject(new Error(`Chunk upload failed with status ${xhr.status}`));
          };
          xhr.onerror = (e) => reject(e);
          xhr.onabort = () => {
            const abortError = new DOMException("Aborted", "AbortError");
            reject(abortError);
          };
          const chunk = file.slice(start, end);
          xhr.send(chunk);
          response.actions.abort = () => xhr.abort();
          response.actions.refresh = () => {
            xhr.abort();
            refresh();
          };
          response.actions.pause = () => null;
          response.actions.resume = () => null;
        },
      );
      uploadResult = await uploadPromise;
    }
    return uploadResult;
  };

  response.result = chunkUpload();
  return response;
};

export default uploadWithXhrChuncked;
