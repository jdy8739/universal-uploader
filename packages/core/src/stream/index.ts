import { UploadResponse, OnProgressParams, UploadParams } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import { calculateSizes, getCustomHeaders, initializeStream } from "../helper";
import { getStreamUploader } from "./helper";

/**
 * Creates a TransformStream that tracks the progress of the data flowing through it.
 * 데이터 흐름을 추적하여 진행률을 계산하는 TransformStream을 생성합니다.
 */
const createProgressStream = ({
  totalFileSize,
  onProgress,
}: {
  totalFileSize: number;
  onProgress?: (args: OnProgressParams) => void;
}) => {
  let bytesRead = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    // Calculate progress by obtaining chunks from the readable stream piped through. No separate data processing is performed.
    // 각 리더블 스트림에 파이프를 걸어 청크를 얻어 진행율을 계산합니다. 별도의 chunk 데이터 가공은 하지 않습니다.
    transform: (chunk, controller) => {
      bytesRead += chunk.byteLength;

      onProgress?.({
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
    onComplete,
  },
}: UploadParams & { refresh: () => void }): Promise<UploadResponse> => {
  const { safeChunkSize } = calculateSizes({
    chunkSize,
    fileSize: file.size,
  });

  const stream = getStreamUploader({ file, chunkSize: safeChunkSize });

  const body = onProgress
    ? stream.pipeThrough(
        createProgressStream({
          totalFileSize: file.size,
          onProgress,
        }),
      )
    : stream;

  const { abortController, streamInit } = initializeStream({
    body,
    withCredentials: withCredentials ?? false,
    customHeaders: getCustomHeaders({ customHeaders, fileName: file.name }),
  });

  const response = fetch(url, streamInit);

  return {
    result: response.then((res) => {
      if (res.ok) {
        // No chunks are transformed for empty files, so emit terminal progress here.
        if (file.size === 0) {
          onProgress?.({ loaded: 0, total: 0, percentage: 100 });
        }

        onComplete?.();
      }

      return {
        ok: res.ok,
        total: file.size,
        message: res.ok ? undefined : `Upload failed with status ${res.status}`,
        status: res.ok ? "success" : "error",
      };
    }),
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
