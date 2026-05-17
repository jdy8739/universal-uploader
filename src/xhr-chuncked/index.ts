interface ChunkUploadMeta {
  safeChunkSize: number;
  totalFileSize: number;
  totalChunks: number;
}

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
  customHeaders,
  onProgress,
  onAbort,
}: {
  url: string;
  file: File;
  customHeaders: Record<string, string>;
  onProgress?: (args: OnProgressParams) => void;
  onAbort?: (e: unknown) => void;
}) =>
  new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

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
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percentage: 100 });
        }

        resolve({
          ok: true,
          total: file.size,
          message: undefined,
          action: {
            abort: xhr.abort,
            refresh: () => {
              xhr.abort();
              // refresh()
            },
          },
        });

        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = (e) => reject(e);
    xhr.onabort = (e) => onAbort?.(e);
    xhr.send(file);
  });

const uploadWithXhrChuncked = async ({
  url,
  file,
  options: { chunkSize, customHeaders = {}, onProgress, onAbort },
}: UploadParams): Promise<UploadResponse> => {
  if (!chunkSize || chunkSize <= 0) {
    return uploadWithoutChunking({ url, file, customHeaders, onProgress });
  }

  const { safeChunkSize, totalFileSize, totalChunks } = getChunkUploadMeta({
    chunkSize,
    fileSize: file.size,
  });

  if (totalFileSize === 0) {
    if (onProgress) {
      onProgress({ loaded: 0, total: 0, percentage: 100 });
    }

    return {
      ok: true,
      total: 0,
      message: undefined,
      action: {
        abort: () => null,
        refresh: () => null,
      },
    };
  }

  let lastResponse: UploadResponse = {
    ok: false,
    total: 0,
    message: undefined,
    action: {
      abort: () => null,
      refresh: () => null,
    },
  };

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const { start, end } = getChunkRange({
      chunkIndex,
      safeChunkSize,
      totalFileSize,
    });

    // eslint-disable-next-line no-await-in-loop -- chunked mode intentionally uploads sequentially
    lastResponse = await new Promise<UploadResponse>((resolve, reject) => {
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
        if (xhr.status >= 200 && xhr.status < 300) {
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
            action: {
              abort: xhr.abort,
              refresh: () => {
                xhr.abort();
                // refresh()
              },
            },
          });

          return;
        }

        reject(new Error(`Chunk upload failed with status ${xhr.status}`));
      };

      xhr.onerror = (e) => reject(e);
      xhr.onabort = (e) => onAbort?.(e);

      const chunk = file.slice(start, end);
      xhr.send(chunk);
    });
  }

  return lastResponse;
};

export default uploadWithXhrChuncked;
