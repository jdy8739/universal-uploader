import type { StreamUploaderParams } from "./types";
import { CHUNK_HEADER_KEYS, DEFAULT_STREAM_CHUNK_SIZE } from "./const";

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
  const safeChunkSize =
    Number.isFinite(chunkSize) && chunkSize > 0
      ? chunkSize
      : DEFAULT_STREAM_CHUNK_SIZE;
  const totalFileSize = fileSize;
  const totalChunks = Math.ceil(totalFileSize / safeChunkSize);

  return {
    safeChunkSize,
    totalFileSize,
    totalChunks,
  };
};

/**
 * Calculates chunk progress state.
 * 청크 진행 상태(isLastChunk, percentage)를 계산합니다.
 */
export const calculateChunkProgress = ({
  loaded,
  total,
}: {
  loaded: number;
  total: number;
}) => {
  const isLastChunk = total === 0 || loaded >= total;
  const percentage = isLastChunk ? 100 : (loaded / total) * 100;

  return { isLastChunk, percentage };
};

/**
 * Calculates the resume start position from a persisted offset.
 * 저장된 오프셋으로부터 재개 시작 위치를 계산합니다.
 */
export const calculateResumePosition = ({
  offset,
  chunkSize,
}: {
  offset?: number;
  chunkSize: number;
}) => {
  const startChunkIndex = Math.floor((offset ?? 0) / chunkSize);
  const startOffset = startChunkIndex * chunkSize;

  return { startChunkIndex, startOffset };
};

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
 * Returns chunk-related headers merged with custom headers.
 * 청크 관련 헤더와 커스텀 헤더를 병합해 반환합니다.
 */
export const getCustomHeaders = ({
  customHeaders,
  chunkIndex,
  totalChunks,
  chunkSize,
  totalFileSize,
  fileName,
}: {
  customHeaders?: Record<string, string>;
  chunkIndex?: number;
  totalChunks?: number;
  chunkSize?: number;
  totalFileSize?: number;
  fileName: string;
}) => {
  const headers: Record<string, string> = {
    [CHUNK_HEADER_KEYS.fileName]: encodeURIComponent(fileName),
    ...(customHeaders || {}),
  };

  if (chunkIndex !== undefined) {
    headers[CHUNK_HEADER_KEYS.chunkIndex] = String(chunkIndex);
  }

  if (totalChunks !== undefined) {
    headers[CHUNK_HEADER_KEYS.totalChunks] = String(totalChunks);
  }

  if (chunkSize !== undefined) {
    headers[CHUNK_HEADER_KEYS.chunkSize] = String(chunkSize);
  }

  if (totalFileSize !== undefined) {
    headers[CHUNK_HEADER_KEYS.fileSize] = String(totalFileSize);
  }

  return headers;
};

/**
 * Initializes a RequestInit object and AbortController for streaming uploads.
 * 스트리밍 업로드를 위한 RequestInit 객체 및 AbortController를 초기화합니다.
 */
export const initializeStream = ({
  body,
  withCredentials,
  customHeaders,
}: {
  body: ReadableStream;
  withCredentials: boolean;
  customHeaders: Record<string, string>;
}) => {
  const abortController = new AbortController();

  const streamInit: Readonly<RequestInit> = {
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

  return { abortController, streamInit };
};
