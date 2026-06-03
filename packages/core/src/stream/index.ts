import { UploadResponse, UploadParamsInternal, UploadResult } from "../types";
import { DEFAULT_STREAM_CHUNK_SIZE } from "../const";
import { calculateSizes, getCustomHeaders, initializeStream } from "../helper";
import { createUploadBody, getStreamUploader } from "./helper";

/**
 * Uploads a file using the Fetch streaming request body.
 * Fetch 스트리밍 요청 바디를 사용하여 파일을 업로드합니다.
 */
const uploadWithStream = async ({
  url,
  file,
  resume,
  refresh,
  options: {
    chunkSize = DEFAULT_STREAM_CHUNK_SIZE,
    customHeaders = {},
    withCredentials,
    onProgress,
    onComplete,
    onPause,
    onResume,
  },
}: UploadParamsInternal): Promise<UploadResponse> => {
  const { safeChunkSize } = calculateSizes({
    chunkSize,
    fileSize: file.size,
  });

  const stream = getStreamUploader({ file, chunkSize: safeChunkSize });

  const body = createUploadBody({
    stream,
    totalFileSize: file.size,
    onProgress,
  });

  const { abortController, streamInit } = initializeStream({
    body,
    withCredentials: withCredentials ?? false,
    customHeaders: getCustomHeaders({ customHeaders, fileName: file.name }),
  });

  const response = fetch(url, streamInit);
  let isPaused = false;

  return {
    result: response
      .then((res) => {
        if (res.ok) {
          // No chunks are transformed for empty files, so emit terminal progress here.
          if (file.size === 0) {
            onProgress?.({ loaded: 0, total: 0, percentage: 100 });
          }

          onComplete?.(res);
        }

        const resultSuccess = {
          ok: res.ok,
          total: file.size,
          message: res.ok
            ? undefined
            : `Upload failed with status ${res.status}`,
          status: res.ok ? "success" : "error",
        } satisfies UploadResult;

        return resultSuccess;
      })
      .catch((e) => {
        if (isPaused && e instanceof DOMException && e.name === "AbortError") {
          const resultAborted = {
            ok: false,
            total: file.size,
            message: undefined,
            status: "paused",
          } satisfies UploadResult;

          return resultAborted;
        }

        throw e;
      }),
    actions: {
      abort: () => {
        isPaused = false;

        abortController.abort(); // Never put an argument when aborting.
      },
      refresh: () => {
        isPaused = false;

        abortController.abort(); // Never put an argument when aborting.
        refresh();
      },
      pause: () => {
        // Actually pause means abort the upload because it is not chunked to catch the chunk upload progress.
        // 실제로 일시정지는 청크 업로드 진행률을 캐치하지 않기 떄문에 업로드를 중단하게 되고 재개 시 업로드를 다시 시작합니다.
        isPaused = true;

        abortController.abort();
        onPause?.();
      },
      resume: () => {
        if (!isPaused) {
          return;
        }

        isPaused = false;

        resume();
        onResume?.();
      },
    },
  };
};

export default uploadWithStream;
