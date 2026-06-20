/**
 * Represents progress information for an upload.
 * 업로드 진행 정보를 나타냅니다.
 */
export interface OnProgressParams {
  /** Bytes loaded so far. / 지금까지 로드된 바이트 수. */
  loaded: number;
  /** Total bytes of the file. / 파일의 전체 바이트 수. */
  total: number;
  /** Percentage completed. / 완료된 비율(%). */
  percentage: number;
}

export type UploadMethod = "auto" | "stream" | "stream chunked" | "xhr chunked" | "custom";

/** Signature for an upload strategy function that can be injected into the upload engine. */
export type UploadStrategy = (
  args: UploadParamsInternal,
) => Promise<UploadResponse>;

/**
 * Configuration options for the upload process.
 * 업로드 프로세스를 위한 구성 옵션입니다.
 */
export interface UploadOptions {
  /** Size of each chunk in bytes. / 각 청크의 바이트 크기. */
  chunkSize?: number;
  /** Internal retry state for resumed chunked uploads. / 청크 재시도 내부 상태용 오프셋입니다(외부 입력용 아님). */
  offset?: number;
  /** Custom HTTP headers to be sent with the request. / 요청과 함께 전송될 커스텀 HTTP 헤더. */
  customHeaders?: Record<string, string>;
  /** Whether to include credentials (cookies, etc.) in the request. / 요청에 자격 증명(쿠키 등)을 포함할지 여부. */
  withCredentials?: boolean;
  /** Maximum number of retries. / 최대 재시도 횟수. */
  retryCount?: number;
  /** Delay before retrying (in ms or as a function). / 재시도 전 지연 시간(ms 또는 함수). */
  retryDelay?: number | ((retryCount: number) => number);
  /** Whether to throw an error on failure. / 실패 시 에러를 던질지 여부. */
  throwOnError?: boolean | ((error: unknown) => boolean);
  /**
   * Callback on successful completion. Receives the server's Fetch Response for 'stream' and 'stream chunked' (final chunk); undefined for 'xhr chunked' and empty-file uploads (no Fetch Response).
   * 성공적으로 완료될 때 호출되는 콜백. 'stream'과 'stream chunked'(마지막 청크)에서는 서버 Fetch Response를 받고, 'xhr chunked' 및 빈 파일 업로드에서는 undefined입니다(Fetch Response 없음).
   */
  onComplete?: (response?: Response) => void;
  /** Callback for progress updates. / 진행률 업데이트를 위한 콜백. */
  onProgress?: (args: OnProgressParams) => void;
  /** Callback on upload abort. / 업로드 중단 시 호출되는 콜백. */
  onAbort?: (error: DOMException) => void;
  /** Callback on retry attempt. / 재시도 시 호출되는 콜백. */
  onRetry?: () => void;
  /** Callback when upload is paused. / 업로드 일시정지 시 호출되는 콜백. */
  onPause?: () => void;
  /** Callback when upload is resumed. / 업로드 재개 시 호출되는 콜백. */
  onResume?: () => void;
  /** Callback on fatal error. / 치명적 에러 발생 시 호출되는 콜백. */
  onError?: (error: Error) => void;
  /** Upload strategy function. Required when using @universal-uploader/core/base. */
  strategy?: UploadStrategy;
}

/**
  * Parameters for starting an upload operation.

 * 업로드 작업을 시작하기 위한 매개변수입니다.
 */
export interface UploadParams {
  /** The destination URL. / 대상 URL. */
  url: string;
  /** The file to upload. / 업로드할 파일. */
  file: File;
  /** Upload options. / 업로드 옵션. */
  options: UploadOptions;
}

export interface UploadParamsInternal extends UploadParams {
  /** Restart upload from the initial options snapshot. / 초기 옵션 스냅샷으로 업로드를 재시작합니다. */
  refresh: () => void;
  /** Resume upload with current retry context and persisted offset. / 현재 재시도 컨텍스트와 저장된 오프셋으로 업로드를 재개합니다. */
  resume: () => void;
}

/**
 * Possible status states of an upload.
 * 업로드의 가능한 상태 값들입니다.
 */
export type UploadStatus =
  | "idle"
  | "uploading"
  | "success"
  | "error"
  | "aborted"
  | "paused";

/**
 * The final result of an upload operation.
 * 업로드 작업의 최종 결과입니다.
 */
export interface UploadResult {
  /** Whether the upload was successful. / 업로드 성공 여부. */
  ok: boolean;
  /** Total bytes of the file. / 파일의 전체 바이트 수. */
  total: number;
  /** Error message if failed. / 실패 시 에러 메시지. */
  message?: string;
  /** Current upload status. / 현재 업로드 상태. */
  status: UploadStatus;
}

/**
 * Actions available to control the upload process.
 * 업로드 프로세스를 제어하기 위한 액션들입니다.
 */
export interface UploadActions {
  /** Abort the current upload. / 현재 업로드를 중단합니다. */
  abort: () => void;
  /** Restart upload from the initial options snapshot (retry/offset reset). / 초기 옵션 스냅샷으로 업로드를 재시작합니다(재시도/오프셋 초기화). */
  refresh: () => void;
  /** Pause the current upload. / 현재 업로드를 일시 중지합니다. */
  pause: () => void;
  /** Resume upload from persisted progress without resetting retry context. / 저장된 진행 상태로 재개하며 재시도 컨텍스트를 초기화하지 않습니다. */
  resume: () => void;
}

/**
 * The response object returned by the upload initiator.
 * 업로드 시작 시 반환되는 응답 객체입니다.
 */
export interface UploadResponse {
  /** Promise that resolves with the final upload result. / 최종 업로드 결과를 반환하는 Promise. */
  result: Promise<UploadResult>;
  /** Available control actions. / 사용 가능한 제어 액션들. */
  actions: UploadActions;
}

/**
 * Upload response enriched with the resolved upload method.
 * 최종적으로 선택된 업로드 방식을 포함한 업로드 응답 타입입니다.
 */
export type UploadResponseWithMethod = UploadResponse & {
  uploadMethod: UploadMethod;
};

/**
 * Parameters for stream uploader configuration.
 * 스트림 업로더 구성을 위한 매개변수입니다.
 */
export interface StreamUploaderParams {
  /** The file to be uploaded. / 업로드할 파일. */
  file: File;
  /** Chunk size in bytes. / 바이트 단위의 청크 크기. */
  chunkSize: number;
}

declare global {
  interface RequestInit {
    /** Duplex mode for streaming fetch requests. / 스트리밍 fetch 요청을 위한 듀플렉스 모드. */
    duplex?: "half";
  }
}
