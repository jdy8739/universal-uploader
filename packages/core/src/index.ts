export * from "./types";

import uploadBase from "./base";
import { getUploader } from "./orchestrator";
import { UploadParams, UploadResponseWithMethod } from "./types";

/**
 * File upload with automatic strategy selection and full fallback bundle.
 * 파일 업로드 - 자동 전략 선택 및 전체 폴백 번들 포함.
 */
const upload = async ({
  url,
  file,
  options,
}: UploadParams): Promise<UploadResponseWithMethod> => {
  if (options.strategy) {
    return uploadBase({ url, file, options });
  }

  const { method, upload: strategy } = getUploader(url, options.method);

  return uploadBase({
    url,
    file,
    options: {
      ...options,
      strategy,
      resolvedMethod: method,
    },
  });
};

export default upload;

export { default as uploadBase } from "./base";
export { default as UPLOAD_WITH_STREAM } from "./stream/index";
export { default as UPLOAD_WITH_FETCH_STREAM_CHUNKED } from "./stream-chunked/index";
export { default as UPLOAD_WITH_XHR_CHUNKED } from "./xhr-chuncked/index";
