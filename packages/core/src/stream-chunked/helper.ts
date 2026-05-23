import { CHUNK_HEADER_KEYS } from "../const";

/**
 * Returns stream-chunked headers merged with custom headers.
 * stream-chunked 요청용 헤더와 커스텀 헤더를 병합해 반환합니다.
 */
export const getStreamChunkHeaders = ({
  customHeaders,
  chunkIndex,
  totalChunks,
  chunkSize,
  totalFileSize,
}: {
  customHeaders: Record<string, string>;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  totalFileSize: number;
}) => ({
  [CHUNK_HEADER_KEYS.chunkIndex]: String(chunkIndex),
  [CHUNK_HEADER_KEYS.totalChunks]: String(totalChunks),
  [CHUNK_HEADER_KEYS.chunkSize]: String(chunkSize),
  [CHUNK_HEADER_KEYS.fileSize]: String(totalFileSize),
  ...customHeaders,
});
