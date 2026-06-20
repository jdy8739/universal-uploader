import { getUploader } from "./orchestrator";
import type { UploadParamsInternal, UploadResponseWithMethod } from "./types";

/**
 * Automatically selects the upload strategy at runtime.
 */
const uploadAuto = async (
  args: UploadParamsInternal,
): Promise<UploadResponseWithMethod> => {
  const { method, upload } = getUploader(args.url, "auto");
  try {
    const response = await upload(args);
    return { ...response, uploadMethod: method };
  } catch (e) {
    if (e && typeof e === "object") {
      Object.assign(e, { uploadMethod: method });
    }
    throw e;
  }
};

export default uploadAuto;
