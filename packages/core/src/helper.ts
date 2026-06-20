import type { StreamUploaderParams, UploadResponse } from "./types";
import { CHUNK_HEADER_KEYS, DEFAULT_STREAM_CHUNK_SIZE } from "./const";

/**
 * Metadata for chunked uploads.
 */
export interface ChunkUploadSizesMeta {
  safeChunkSize: number;
  totalFileSize: number;
  totalChunks: number;
}

/**
 * Calculates metadata for chunked uploads, such as safe chunk size and total chunks.
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

/**
 * Syncs latest actions into the current actions object in place.
 */
export const syncLatestActions = <
  TCurrent extends UploadResponse["actions"],
  TLatest extends UploadResponse["actions"],
>(
  currentActions: TCurrent | undefined,
  latestActions: TLatest,
): TCurrent | undefined => {
  if (!currentActions) {
    return currentActions;
  }

  Object.assign<TCurrent, TLatest>(currentActions, latestActions);
  return currentActions;
};
