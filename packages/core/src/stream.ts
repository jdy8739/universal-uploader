import uploadStream from "./stream/index";
import type { UploadParamsInternal, UploadResponseWithMethod } from "./types";

const uploadWithStream = async (
  args: UploadParamsInternal,
): Promise<UploadResponseWithMethod> => {
  try {
    const response = await uploadStream(args);
    return { ...response, uploadMethod: "stream" };
  } catch (e) {
    if (e && typeof e === "object") {
      Object.assign(e, { uploadMethod: "stream" });
    }
    throw e;
  }
};

export default uploadWithStream;
