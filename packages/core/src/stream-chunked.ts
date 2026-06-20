import uploadFetchStreamChunked from "./stream-chunked/index";
import type { UploadParamsInternal, UploadResponseWithMethod } from "./types";

const uploadWithFetchStreamChunked = async (
  args: UploadParamsInternal,
): Promise<UploadResponseWithMethod> => {
  try {
    const response = await uploadFetchStreamChunked(args);
    return { ...response, uploadMethod: "stream chunked" };
  } catch (e) {
    if (e && typeof e === "object") {
      Object.assign(e, { uploadMethod: "stream chunked" });
    }
    throw e;
  }
};

export default uploadWithFetchStreamChunked;
