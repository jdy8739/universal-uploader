declare interface UploadParams {
  url: string;
  file: File;
  option: {
    chunkSize?: number;
    customHeaders?: Record<string, string>;
    onProgress?: ({
      loaded,
      total,
      percentage,
    }: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void;
  };
}
