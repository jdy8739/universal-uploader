interface StreamUploaderParams {
  file: File;
  chunkSize: number;
}

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
  onProgress: ({
    loaded,
    total,
    percentage,
  }: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
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

const uploadWithStream = async ({
  url,
  file,
  options: { chunkSize = 1024 * 1024, customHeaders = {}, onProgress },
}: UploadParams): Promise<UploadResponse> => {
  const stream = getStreamUploader({ file, chunkSize });

  const body = onProgress
    ? stream.pipeThrough(createProgressStream({ totalFileSize: file.size, onProgress }))
    : stream;

  const init: RequestInit = {
    method: 'POST',
    body,
    duplex: 'half',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...(customHeaders || {}),
    },
  };

  const response = await fetch(url, init);

  return { ok: response.ok, total: file.size, message: undefined };
};

export default uploadWithStream;
