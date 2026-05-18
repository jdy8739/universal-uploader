interface StreamUploaderParams {
  file: File;
  chunkSize: number;
}

/**
 * Default chunk size (1 MiB) for stream uploads.
 * Used as both API default and fallback for invalid chunk sizes.
 */
const DEFAULT_STREAM_CHUNK_SIZE = 1024 * 1024;

const createBuffer = async ({
  file,
  offset,
  chunkSize,
}: StreamUploaderParams & { offset: number }) => {
  const chunk = file.slice(offset, offset + chunkSize);

  const buffer = await chunk.arrayBuffer();

  return new Uint8Array(buffer);
};

const getStreamUploader = ({ file, chunkSize }: StreamUploaderParams) => {
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (offset >= file.size) {
        controller.close();
        return;
      }

      const chunkBuffer = await createBuffer({ file, offset, chunkSize });
      controller.enqueue(chunkBuffer);
      offset += chunkSize;

      if (offset >= file.size) {
        controller.close();
      }
    },
  });
};

const createProgressStream = ({
  totalFileSize,
  onProgress,
}: {
  totalFileSize: number;
  onProgress: (args: OnProgressParams) => void;
}) => {
  let bytesRead = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesRead += chunk.byteLength;
      onProgress({
        loaded: bytesRead,
        percentage: (bytesRead / totalFileSize) * 100,
        total: totalFileSize,
      });

      controller.enqueue(chunk);
    },
  });
};

/**
 * Uploads a file using the Fetch streaming request body.
 */
const uploadWithStream = async ({
  url,
  file,
  refresh,
  options: { chunkSize = DEFAULT_STREAM_CHUNK_SIZE, customHeaders = {}, onProgress },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const safeChunkSize =
    Number.isFinite(chunkSize) && chunkSize > 0 ? chunkSize : DEFAULT_STREAM_CHUNK_SIZE;
  const stream = getStreamUploader({ file, chunkSize: safeChunkSize });

  const body = onProgress
    ? stream.pipeThrough(createProgressStream({ totalFileSize: file.size, onProgress }))
    : stream;

  const abortController = new AbortController();

  const init: Readonly<RequestInit> = {
    method: 'POST',
    body,
    duplex: 'half',
    signal: abortController.signal,
    headers: {
      'Content-Type': 'application/octet-stream',
      ...(customHeaders || {}),
    },
  };

  const response = fetch(url, init);

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: res.ok ? undefined : `Upload failed with status ${res.status}`,
      status: res.ok ? 'success' : 'error',
    })),
    actions: {
      abort: () => abortController.abort(),
      refresh: () => {
        abortController.abort();
        refresh();
      },
    },
  };
};

export default uploadWithStream;
