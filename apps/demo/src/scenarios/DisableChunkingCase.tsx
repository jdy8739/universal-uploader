import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@usu/react";
import { useI18n } from "../i18n";

interface DisableChunkingCaseProps {
  file: File | null;
}

export const DisableChunkingCase = ({ file }: DisableChunkingCaseProps) => {
  const [resultMessage, setResultMessage] = useState("Not started");
  const [progress, setProgress] = useState(0);
  const { t } = useI18n();

  const { upload, status, result, abort, pause, resume } = useUniversalUpload({
    url: "/upload",
    options: {
      method: "xhr chunked",
      chunkSize: 0, // Should trigger fallback to uploadWithoutChunking
      onProgress: (p) => setProgress(Math.round(p.percentage)),
    },
  });

  const handleRun = async () => {
    if (!file) return;

    setResultMessage("Running...");
    setProgress(0);
    await upload(file);
    setResultMessage("Completed (Method: Standard XHR)");
  };

  return (
    <Card>
      <Card.Title>{t("test.scenarios.disableChunking.title")}</Card.Title>
      <Card.Description>
        {t("test.scenarios.disableChunking.description")}
      </Card.Description>
      <div className="flex gap-2 flex-wrap mb-4">
        <Button onClick={handleRun} disabled={!file || status === "uploading"}>
          Run
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
      <Card.ProgressBar value={status === "success" ? 100 : progress} />
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "progress", value: `${progress}%` },
            { label: "resultOk", value: result.ok.toString() },
            { label: "message", value: resultMessage },
          ]}
        />
      </Log>
      {result.ok && (
        <Badge variant="success" className="mt-3">
          Success
        </Badge>
      )}
    </Card>
  );
};

export default DisableChunkingCase;
