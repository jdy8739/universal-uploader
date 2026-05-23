import { UploadParams, UploadResponse, OnProgressParams } from "../index";

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
 * Default chunk size (1 MiB) for stream uploads.
 * Used as both API default and fallback for invalid chunk sizes.
 *
 * 스트림 업로드를 위한 기본 청크 크기(1 MiB)입니다.
 * API 기본값 및 유효하지 않은 청크 크기에 대한 폴백으로 사용됩니다.
 */
const DEFAULT_STREAM_CHUNK_SIZE = 1024 * 1024;

/**
 * Creates a Uint8Array buffer from a specific slice of the file.
 * 파일의 특정 부분을 잘라 Uint8Array 버퍼를 생성합니다.
 */
const createBuffer = async ({
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

/**
 * Creates a TransformStream that tracks the progress of the data flowing through it.
 * 데이터 흐름을 추적하여 진행률을 계산하는 TransformStream을 생성합니다.
 */
const createProgressStream = ({
  totalFileSize,
  onProgress,
}: {
  totalFileSize: number;
  onProgress: (args: OnProgressParams) => void;
}) => {
  let bytesRead = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    // Calculate progress by obtaining chunks from the readable stream piped through. No separate data processing is performed.
    // 각 리더블 스트림에 파이프를 걸어 청크를 얻어 진행율을 계산합니다. 별도의 chunk 데이터 가공은 하지 않습니다.
    transform: (chunk, controller) => {
      bytesRead += chunk.byteLength;
      onProgress({
        loaded: bytesRead,
        percentage: (bytesRead / totalFileSize) * 100,
        total: totalFileSize,
      });

      controller.enqueue(chunk);
    },

    // Trigger the final progress event once the transform streaming is complete.
    // 변환 스트리밍이 완료되면 마지막 프로그레스 이벤트를 발생시킵니다.
    flush: () => {
      onProgress({
        loaded: totalFileSize,
        percentage: 100,
        total: totalFileSize,
      });
    },
  });
};

/**
 * Uploads a file using the Fetch streaming request body.
 * Fetch 스트리밍 요청 바디를 사용하여 파일을 업로드합니다.
 */
const uploadWithStream = async ({
  url,
  file,
  refresh,
  options: {
    chunkSize = DEFAULT_STREAM_CHUNK_SIZE,
    customHeaders = {},
    withCredentials,
    onProgress,
  },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const safeChunkSize =
    Number.isFinite(chunkSize) && chunkSize > 0
      ? chunkSize
      : DEFAULT_STREAM_CHUNK_SIZE;

  const stream = getStreamUploader({ file, chunkSize: safeChunkSize });

  const body = onProgress
    ? stream.pipeThrough(
        createProgressStream({ totalFileSize: file.size, onProgress }),
      )
    : stream;

  const abortController = new AbortController();

  const init: Readonly<RequestInit> = {
    method: "POST",
    body,
    duplex: "half",
    signal: abortController.signal,
    credentials: withCredentials ? "include" : "same-origin",
    headers: {
      "Content-Type": "application/octet-stream",
      ...(customHeaders || {}),
    },
  };

  const response = fetch(url, init);

  return {
    result: response.then((res) => ({
      ok: res.ok,
      total: file.size,
      message: res.ok ? undefined : `Upload failed with status ${res.status}`,
      status: res.ok ? "success" : "error",
    })),
    actions: {
      abort: () => abortController.abort(), // Never put an argument when aborting.
      refresh: () => {
        abortController.abort(); // Never put an argument when aborting.
        refresh();
      },
      pause: () => null,
      resume: () => null,
    },
  };
};

export default uploadWithStream;
