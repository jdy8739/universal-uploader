import { getCustomHeaders } from "../helper";

const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE = 300;

/**
 * Checks if the given HTTP status code indicates success (2xx).
 */
export const isSuccessfulHttpStatus = (status: number) =>
  status >= HTTP_STATUS_SUCCESS_MIN &&
  status < HTTP_STATUS_SUCCESS_MAX_EXCLUSIVE;

/**
 * Calculates the end byte position for a specific chunk.
 */
export const calculateChunkEnd = ({
  chunkIndex,
  chunkSize,
  totalFileSize,
}: {
  chunkIndex: number;
  chunkSize: number;
  totalFileSize: number;
}) => Math.min((chunkIndex + 1) * chunkSize, totalFileSize);

/**
 * Applies chunking-related headers and custom headers to the XMLHttpRequest object.
 */
export const applyChunkHeaders = ({
  xhr,
  customHeaders,
  chunkIndex,
  totalChunks,
  safeChunkSize,
  totalFileSize,
  fileName,
}: {
  xhr: XMLHttpRequest;
  customHeaders?: Record<string, string>;
  chunkIndex?: number;
  totalChunks?: number;
  safeChunkSize?: number;
  totalFileSize?: number;
  fileName: string;
}) => {
  const headers = getCustomHeaders({
    customHeaders,
    chunkIndex,
    totalChunks,
    chunkSize: safeChunkSize,
    totalFileSize,
    fileName,
  });

  Object.entries(headers).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });
};
