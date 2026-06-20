/**
 * Default chunk size (1 MiB) for stream uploads.
 * Used as both API default and fallback for invalid chunk sizes.
 *
 */
export const DEFAULT_STREAM_CHUNK_SIZE = 1024 * 1024;

/**
 * Header keys used for chunked upload metadata.
 */
export const CHUNK_HEADER_KEYS = {
  chunkIndex: "X-Chunk-Index",
  totalChunks: "X-Total-Chunks",
  chunkSize: "X-Chunk-Size",
  fileSize: "X-File-Size",
  fileName: "X-File-Name",
} as const;
