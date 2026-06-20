import uploadXhrChunked from "./xhr-chuncked/index";
import type { UploadParamsInternal, UploadResponseWithMethod } from "./types";

const uploadWithXhrChunked = async (
  args: UploadParamsInternal,
): Promise<UploadResponseWithMethod> => {
  try {
    const response = await uploadXhrChunked(args);
    return { ...response, uploadMethod: "xhr chunked" };
  } catch (e) {
    if (e && typeof e === "object") {
      Object.assign(e, { uploadMethod: "xhr chunked" });
    }
    throw e;
  }
};

export default uploadWithXhrChunked;
