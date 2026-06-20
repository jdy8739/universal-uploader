/* eslint-disable no-nested-ternary */
import { useUniversalUpload, UploadStrategy } from "@universal-uploader/react";
import { Card, Button, Log, Badge } from "../ui";
import { useState } from "react";
import { useI18n } from "../i18n";

interface UploadCardProps {
  title: string;
  file: File | null;
  tag?: string;
  strategy?: UploadStrategy;
  showResolvedMethod?: boolean;
}

export const UploadCard = ({
  title,
  tag,
  file,
  strategy,
  showResolvedMethod = false,
}: UploadCardProps) => {
  const [progress, setProgress] = useState(0);
  const { t } = useI18n();

  const { upload, status, error, abort, refresh, result, pause, resume, uploadMethod } =
    useUniversalUpload({
      url: "/upload",
      options: {
        strategy,
        chunkSize: 1024 * 1024,
        onProgress: (p) => setProgress(Math.round(p.percentage)),
      },
    });

  const handleUpload = () => {
    if (!file) return;
    setProgress(0);
    upload(file);
  };

  const isChunkable = tag === "stream chunked" || tag === "xhr chunked" || !tag;
  const tagClass =
    tag === "stream" || tag === "stream chunked"
      ? "tag tag-stream"
      : tag === "xhr chunked"
        ? "tag tag-xhr"
        : "tag";

  return (
    <Card>
      <header>
        <span className={tagClass}>{tag || "auto"}</span>
        <Card.Title>{title}</Card.Title>
        <Card.Description>
          {tag === "stream"
            ? t("test.scenarios.uploadCard.stream")
            : tag === "stream chunked"
              ? t("test.scenarios.uploadCard.streamChunked")
              : tag === "xhr chunked"
                ? t("test.scenarios.uploadCard.xhrChunked")
                : t("test.scenarios.uploadCard.auto")}
        </Card.Description>
      </header>

      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <Button
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
        >
          {status === "idle" || status === "aborted"
            ? "Start Upload"
            : status === "success" || status === "error"
              ? "Upload Again"
              : status === "paused"
                ? "Restart Upload"
                : "Uploading..."}
        </Button>
        <Button
          variant="outline"
          onClick={abort}
          disabled={status !== "uploading" && status !== "paused"}
        >
          Abort
        </Button>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={status === "idle"}
        >
          Refresh
        </Button>
        {isChunkable && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={pause}
              disabled={status !== "uploading"}
            >
              Pause
            </Button>
            <Button
              variant="outline"
              onClick={resume}
              disabled={status !== "paused"}
            >
              Resume
            </Button>
          </div>
        )}
      </div>

      {status !== "idle" && (
        <section aria-labelledby={`progress-title-${tag || "auto"}`}>
          <h4 id={`progress-title-${tag || "auto"}`} className="sr-only">
            Upload Progress
          </h4>
          <Card.ProgressBar
            value={status === "success" ? 100 : progress}
            variant={
              status === "success"
                ? "success"
                : status === "error"
                  ? "error"
                  : "info"
            }
          />
          <div className="mt-3 flex gap-2">
            <Badge
              variant={
                status === "error"
                  ? "error"
                  : status === "success"
                    ? "success"
                    : status === "paused"
                      ? "info"
                      : "info"
              }
            >
              {status.toUpperCase()}
            </Badge>
            <Badge>{status === "success" ? 100 : progress}%</Badge>
          </div>

          <Log className="mt-3">
            <Log.Data
              items={[
                { label: "ok", value: result.ok.toString() },
                { label: "message", value: result.message || "N/A" },
                { label: "status", value: result.status },
                { label: "progress", value: `${progress}%` },
                ...(showResolvedMethod
                  ? [
                      {
                        label: "uploadMethod",
                        value: uploadMethod ?? "pending",
                      },
                    ]
                  : []),
              ]}
            />
          </Log>

          {error && (
            <Badge variant="error" className="mt-3">
              {error.message}
            </Badge>
          )}
        </section>
      )}
    </Card>
  );
};

export default UploadCard;
