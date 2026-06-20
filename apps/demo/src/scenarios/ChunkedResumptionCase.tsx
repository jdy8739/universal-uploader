import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload, UploadStrategy } from "@universal-uploader/react";
import { useI18n } from "../i18n";

interface ChunkedResumptionCaseProps {
  file: File | null;
  tag: string;
  strategy: UploadStrategy;
  title: string;
}

export const ChunkedResumptionCase = ({
  file,
  tag,
  strategy,
  title,
}: ChunkedResumptionCaseProps) => {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const { t } = useI18n();

  const {
    upload,
    refresh,
    status,
    result,
    error,
    abort,
    pause,
    resume,
    uploadMethod,
  } = useUniversalUpload({
    url: "/upload/fail-at-chunk-3",
    options: {
      strategy,
      chunkSize: 1024 * 512,
      retryCount: 3,
      retryDelay: 1000,
      onProgress: (p) => {
        setProgress(p.percentage);
        setLog((prev) => [
          ...prev.slice(-4),
          `Progress: ${p.percentage.toFixed(0)}%`,
        ]);
      },
      onError: (e) =>
        setLog((prev) => [
          ...prev.slice(-4),
          `Error: ${e.message}, retrying...`,
        ]),
    },
  });

  const handleRun = () => {
    if (!file) return;
    setLog(["Started..."]);
    setProgress(0);
    upload(file);
  };

  return (
    <Card>
      <Card.Title>{title}</Card.Title>
      <Card.Description>
        {t("test.scenarios.chunkedResumption.description", "").replace(
          "{method}",
          tag,
        )}
      </Card.Description>

      <div className="scenario-actions">
        <Button onClick={handleRun} disabled={!file || status === "uploading"}>
          Start Test
        </Button>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={status === "idle"}
        >
          Refresh
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

      <div className="flex gap-2 mb-4">
        <Badge
          variant={
            status === "error"
              ? "error"
              : status === "success"
                ? "success"
                : "info"
          }
        >
          {status.toUpperCase()}
        </Badge>
        {status === "uploading" && <Badge variant="info">In Progress</Badge>}
      </div>

      <Card.ProgressBar
        value={status === "success" ? 100 : progress}
        variant={status === "error" ? "error" : "info"}
      />

      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "resultOk", value: result.ok.toString() },
            { label: "message", value: result.message || "N/A" },
            { label: "uploadMethod", value: uploadMethod ?? "pending" },
          ]}
        />
        <div className="mt-4 pt-4 border-t border-stone-200">
          {log.map((entry, i) => (
            <Log.Entry key={i}>{entry}</Log.Entry>
          ))}
        </div>
      </Log>

      {error && (
        <Badge variant="error" className="mt-3">
          Error: {error.message}
        </Badge>
      )}
    </Card>
  );
};

export default ChunkedResumptionCase;
