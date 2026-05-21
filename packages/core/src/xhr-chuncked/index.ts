interface ChunkUploadMeta {
  safeChunkSize: number;
  totalFileSize: number;
  totalChunks: number;
}

const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE = 300;

/**
 * Checks if the given HTTP status code indicates success (2xx).
 * 주어진 HTTP 상태 코드가 성공(2xx)을 나타내는지 확인합니다.
 */
const isSuccessfulHttpStatus = (status: number) =>
  status >= HTTP_STATUS_SUCCESS_MIN && status < HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE;

/**
 * Calculates metadata for chunked uploads, such as safe chunk size and total chunks.
 * 안전한 청크 크기 및 전체 청크 수와 같은 청크 업로드용 메타데이터를 계산합니다.
 */
const getChunkUploadMeta = ({
  chunkSize,
  fileSize,
}: {
  chunkSize: number;
  fileSize: number;
}): ChunkUploadMeta => {
  const safeChunkSize = Math.max(1, chunkSize);
  const totalFileSize = fileSize;
  const totalChunks = Math.ceil(totalFileSize / safeChunkSize);

  return {
    safeChunkSize,
    totalFileSize,
    totalChunks,
  };
};

/**
 * Calculates the start and end byte positions for a specific chunk.
 * 특정 청크의 시작 및 종료 바이트 위치를 계산합니다.
 */
const getChunkRange = ({
  chunkIndex,
  safeChunkSize,
  totalFileSize,
}: {
  chunkIndex: number;
  safeChunkSize: number;
  totalFileSize: number;
}) => {
  const start = chunkIndex * safeChunkSize;
  const end = Math.min(start + safeChunkSize, totalFileSize);

  return {
    start,
    end,
  };
};

/**
 * Applies chunking-related headers and custom headers to the XMLHttpRequest object.
 * XMLHttpRequest 객체에 청크 관련 헤더 및 커스텀 헤더를 적용합니다.
 */
const applyChunkHeaders = ({
  xhr,
  customHeaders,
  chunkIndex,
  totalChunks,
  safeChunkSize,
  totalFileSize,
}: {
  xhr: XMLHttpRequest;
  customHeaders: Record<string, string>;
  chunkIndex: number;
  totalChunks: number;
  safeChunkSize: number;
  totalFileSize: number;
}) => {
  xhr.setRequestHeader('X-Chunk-Index', String(chunkIndex));
  xhr.setRequestHeader('X-Total-Chunks', String(totalChunks));
  xhr.setRequestHeader('X-Chunk-Size', String(safeChunkSize));
  xhr.setRequestHeader('X-File-Size', String(totalFileSize));

  Object.entries(customHeaders).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });
};

/**
 * Handles file upload as a single request without chunking using XMLHttpRequest.
 * XMLHttpRequest를 사용하여 파일을 청크 분할 없이 단일 요청으로 업로드합니다.
 */
const uploadWithoutChunking = ({
  url,
  file,
  refresh,
  customHeaders,
  onProgress,
}: {
  url: string;
  file: File;
  refresh: () => void;
  customHeaders: Record<string, string>;
  onProgress?: (args: OnProgressParams) => void;
}): UploadResponse => {
  const xhr = new XMLHttpRequest();

  const response = new Promise<UploadResult>((resolve, reject) => {
    xhr.open('POST', url);

    Object.entries(customHeaders).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        const total = event.total || file.size;
        const percentage = total === 0 ? 100 : (event.loaded / total) * 100;

        onProgress({
          loaded: event.loaded,
          total,
          percentage,
        });
      };
    }

    xhr.onload = () => {
      if (isSuccessfulHttpStatus(xhr.status)) {
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percentage: 100 });
        }

        resolve({
          ok: true,
          total: file.size,
          message: undefined,
          status: 'success',
        });

        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = (e) => reject(e);
    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };
    xhr.send(file);
  });

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: undefined,
      status: 'success',
    })),
    actions: {
      abort: () => xhr.abort(),
      refresh: () => {
        xhr.abort();
        refresh();
      },
    },
  };
};

/**
 * Uploads a file by splitting it into sequential chunks using XMLHttpRequest.
 * XMLHttpRequest를 사용하여 파일을 여러 개의 청크로 나누어 순차적으로 업로드합니다.
 */
const uploadWithXhrChuncked = async ({
  url,
  file,
  refresh,
  options: { chunkSize, customHeaders = {}, onProgress },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const response: UploadResponse = {
    result: Promise.resolve({ ok: false, total: 0, message: undefined, status: 'idle' }),
    actions: {
      abort: () => null,
      refresh: () => null,
    },
  };

  if (!chunkSize || chunkSize <= 0) {
    return uploadWithoutChunking({ url, file, refresh, customHeaders, onProgress });
  }

  const { safeChunkSize, totalFileSize, totalChunks } = getChunkUploadMeta({
    chunkSize,
    fileSize: file.size,
  });

  if (totalFileSize === 0) {
    if (onProgress) {
      onProgress({ loaded: 0, total: 0, percentage: 100 });
    }

    response.result = Promise.resolve({
      ok: true,
      total: 0,
      message: undefined,
      status: 'success',
    });

    return response;
  }

  /**
   * Orchestrates the sequential upload of all chunks.
   * 모든 청크의 순차적 업로드를 조율합니다.
   */
  const chunkUpload = async (): Promise<Readonly<UploadResult>> => {
    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
      status: 'uploading',
    };

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const { start, end } = getChunkRange({
        chunkIndex,
        safeChunkSize,
        totalFileSize,
      });

      const uploadPromise = new Promise<Readonly<UploadResult>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', url);

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
            const percentage = isLastChunk ? 100 : (end / totalFileSize) * 100;

            if (onProgress) {
              onProgress({
                loaded: end,
                total: totalFileSize,
                percentage: totalFileSize === 0 ? 100 : percentage,
              });
            }

            resolve({
              ok: true,
              total: totalFileSize,
              message: undefined,
              status: isLastChunk ? 'success' : 'uploading',
            });

            return;
          }

          reject(new Error(`Chunk upload failed with status ${xhr.status}`));
        };

        xhr.onerror = (e) => reject(e);
        xhr.onabort = () => {
          const abortError = new DOMException('Aborted', 'AbortError');
          reject(abortError);
        };

        const chunk = file.slice(start, end);
        xhr.send(chunk);

        // Update actions to refer to the current XHR request.
        // 현재 XHR 요청을 참조하도록 액션을 업데이트합니다.
        response.actions.abort = () => xhr.abort();
        response.actions.refresh = () => {
          xhr.abort();
          refresh();
        };
      });

      // Sequential execution using await within a loop for chunked transfer.
      // 청크 전송을 위해 루프 내에서 await를 사용하여 순차적으로 실행합니다.
      // eslint-disable-next-line no-await-in-loop -- chunked mode intentionally uploads sequentially
      uploadResult = await uploadPromise;
    }

    return uploadResult;
  };

  response.result = chunkUpload();

  return response;
};

export default uploadWithXhrChuncked;
