/**
 * Metadata for chunked uploads.
 * 청크 단위 업로드를 위한 메타데이터입니다.
 */
export interface ChunkUploadSizesMeta {
  /** Safe size of each chunk. / 안전한 각 청크의 크기. */
  safeChunkSize: number;
  /** Total file size. / 전체 파일 크기. */
  totalFileSize: number;
  /** Total number of chunks. / 전체 청크 수. */
  totalChunks: number;
}

/**
 * Calculates metadata for chunked uploads, such as safe chunk size and total chunks.
 * 안전한 청크 크기 및 전체 청크 수와 같은 청크 업로드용 메타데이터를 계산합니다.
 */
export const calculateSizes = ({
  chunkSize,
  fileSize,
}: {
  chunkSize: number;
  fileSize: number;
}): ChunkUploadSizesMeta => {
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
 * Parameters for stream uploader configuration.
 * 스트림 업로더 구성을 위한 매개변수입니다.
 */
interface StreamUploaderParams {
  /** The file to be uploaded. / 업로드할 파일. */
  file: File;
  /** Chunk size in bytes. / 바이트 단위의 청크 크기. */
  chunkSize: number;
}

/**
 * Creates a Uint8Array buffer from a specific slice of the file.
 * 파일의 특정 부분을 잘라 Uint8Array 버퍼를 생성합니다.
 */
export const createBuffer = async ({
  file,
  offset,
  chunkSize,
}: StreamUploaderParams & { offset: number }) => {
  const chunk = file.slice(offset, offset + chunkSize);

  const buffer = await chunk.arrayBuffer();

  return new Uint8Array(buffer);
};

/**
 * Returns a ReadableStream that yields chunks of the file.
 * 파일의 청크를 순차적으로 내보내는 ReadableStream을 반환합니다.
 */
export const getStreamUploader = ({
  file,
  chunkSize,
}: StreamUploaderParams) => {
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
