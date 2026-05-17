interface ChunkUploadMeta {
  safeChunkSize: number;
  totalFileSize: number;
  totalChunks: number;
}

const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE = 300;

const isSuccessfulHttpStatus = (status: number) =>
  status >= HTTP_STATUS_SUCCESS_MIN && status < HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE;

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
        });

        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = (e) => reject(e);
    xhr.onabort = () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      reject(abortError);
    };
    xhr.send(file);
  });

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: undefined,
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

const uploadWithXhrChuncked = async ({
  url,
  file,
  refresh,
  options: { chunkSize, customHeaders = {}, onProgress },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const response: UploadResponse = {
    result: Promise.resolve({ ok: false, total: 0, message: undefined }),
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

    response.result = Promise.resolve({ ok: true, total: 0, message: undefined });

    return response;
  }

  const chunkUpload = async (): Promise<Readonly<UploadResult>> => {
    let uploadResult: Readonly<UploadResult> = {
      ok: false,
      total: 0,
      message: undefined,
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
            if (onProgress) {
              onProgress({
                loaded: end,
                total: totalFileSize,
                percentage: totalFileSize === 0 ? 100 : (end / totalFileSize) * 100,
              });
            }

            resolve({
              ok: true,
              total: totalFileSize,
              message: undefined,
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

        // 불변성을 보장하지 않고 클로저에서 actions 변경하는 방식
        response.actions = {
          abort: () => xhr.abort(),
          refresh: () => {
            xhr.abort();
            refresh();
          },
        };
      });

      // 불변성을 보장하지 않고 클로저에서 result 변경 (빠른 UX를 위해, chunkUpload의 action 먼저 반환하고 나머지는 클로저로 업데이트하는 방식)
      // eslint-disable-next-line no-await-in-loop -- chunked mode intentionally uploads sequentially
      uploadResult = await uploadPromise;
    }

    return uploadResult;
  };

  response.result = chunkUpload();

  return response;
};

export default uploadWithXhrChuncked;
