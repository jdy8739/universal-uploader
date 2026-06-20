import uploadCore from "@universal-uploader/core/base";
import { createUseUniversalUpload } from "./createUseUniversalUpload";

const useUniversalUpload = createUseUniversalUpload(uploadCore);

export default useUniversalUpload;
