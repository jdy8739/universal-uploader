import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@usu/react";

interface DisableChunkingCaseProps {
  file: File | null;
}

export const DisableChunkingCase = ({ file }: DisableChunkingCaseProps) => {
  const [resultMessage, setResultMessage] = useState("Not started");

  const { upload, status, result, abort, pause, resume } = useUniversalUpload({
    url: "/upload",
    options: {
      method: "xhr chunked",
      chunkSize: 0, // Should trigger fallback to uploadWithoutChunking
    },
  });

  const handleRun = async () => {
    if (!file) return;

    setResultMessage("Running...");
    await upload(file);
    setResultMessage("Completed (Method: Standard XHR)");
  };

  return (
    <Card>
      <Card.Title>Disable Chunking Case</Card.Title>
      <Card.Description>
        Sets `chunkSize: 0` to trigger the fallback to standard XHR upload.
      </Card.Description>
      <div className="flex gap-2 flex-wrap mb-4">
        <Button onClick={handleRun} disabled={!file || status === "uploading"}>
          Run
        </Button>
        <Button variant="outline" onClick={abort} disabled={status !== "uploading"}>
          Abort
        </Button>
        <Button variant="outline" onClick={pause} disabled={status !== "uploading"}>
          Pause
        </Button>
        <Button variant="outline" onClick={resume} disabled={status !== "uploading"}>
          Resume
        </Button>
      </div>
      <Card.ProgressBar value={result.total} />
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
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
