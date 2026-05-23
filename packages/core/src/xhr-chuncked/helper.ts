const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE = 300;

/**
 * Checks if the given HTTP status code indicates success (2xx).
 * 주어진 HTTP 상태 코드가 성공(2xx)을 나타내는지 확인합니다.
 */
export const isSuccessfulHttpStatus = (status: number) =>
  status >= HTTP_STATUS_SUCCESS_MIN &&
  status < HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE;

/**
 * Calculates the start and end byte positions for a specific chunk.
 * 특정 청크의 시작 및 종료 바이트 위치를 계산합니다.
 */
export const calculateChunkRange = ({
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
export const applyChunkHeaders = ({
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
  xhr.setRequestHeader("X-Chunk-Index", String(chunkIndex));
  xhr.setRequestHeader("X-Total-Chunks", String(totalChunks));
  xhr.setRequestHeader("X-Chunk-Size", String(safeChunkSize));
  xhr.setRequestHeader("X-File-Size", String(totalFileSize));

  Object.entries(customHeaders).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });
};
