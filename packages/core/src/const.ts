/**
 * Default chunk size (1 MiB) for stream uploads.
 * Used as both API default and fallback for invalid chunk sizes.
 *
 * 스트림 업로드를 위한 기본 청크 크기(1 MiB)입니다.
 * API 기본값 및 유효하지 않은 청크 크기에 대한 폴백으로 사용됩니다.
 */
export const DEFAULT_STREAM_CHUNK_SIZE = 1024 * 1024;

/**
 * Header keys used for chunked upload metadata.
 * 청크 업로드 메타데이터에 사용되는 헤더 키입니다.
 */
export const CHUNK_HEADER_KEYS = {
  chunkIndex: "X-Chunk-Index",
  totalChunks: "X-Total-Chunks",
  chunkSize: "X-Chunk-Size",
  fileSize: "X-File-Size",
} as const;
