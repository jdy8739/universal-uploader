/* eslint-disable no-nested-ternary */
import { useUniversalUpload, UploadMethod } from "@usu/react";
import { Card, Button, Log, Badge } from "../ui";
import { useState } from "react";
import { useI18n } from "../i18n";

interface UploadCardProps {
  title: string;
  file: File | null;
  method: UploadMethod;
}

export const UploadCard = ({ title, method, file }: UploadCardProps) => {
  const [progress, setProgress] = useState(0);
  const { t } = useI18n();

  const { upload, status, error, abort, retry, result, pause, resume } =
    useUniversalUpload({
      url: "/upload",
      options: {
        method,
        chunkSize: 1024 * 1024,
        onProgress: (p) => setProgress(Math.round(p.percentage)),
      },
    });

  const handleUpload = () => {
    if (!file) return;
    setProgress(0);
    upload(file);
  };

  const tagClass =
    method === "stream"
      ? "tag tag-stream"
      : method === "stream chunked"
        ? "tag tag-stream"
        : method === "xhr chunked"
          ? "tag tag-xhr"
          : "tag";

  return (
    <Card>
      <header>
        <span className={tagClass}>{method}</span>
        <Card.Title>{title}</Card.Title>
        <Card.Description>
          {method === "stream"
            ? t("test.scenarios.uploadCard.stream")
            : method === "stream chunked"
              ? t("test.scenarios.uploadCard.streamChunked")
              : method === "xhr chunked"
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
              ? "Retry Upload"
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
          onClick={() => file && retry(file)}
          disabled={!file || status === "idle"}
        >
          Retry
        </Button>
        {(method === "xhr chunked" ||
          method === "stream chunked" ||
          method === "auto") && (
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
        <section aria-labelledby={`progress-title-${method}`}>
          <h4 id={`progress-title-${method}`} className="sr-only">
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
