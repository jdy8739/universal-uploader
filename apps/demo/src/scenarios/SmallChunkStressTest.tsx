import { Card } from "../ui";
import { Button } from "../ui";
import { useUniversalUpload } from "@usu/react";
import { Badge } from "../ui";
import { useState } from "react";

interface SmallChunkStressTestProps {
  file: File | null;
}
export const SmallChunkStressTest = ({ file }: SmallChunkStressTestProps) => {
  const [progress, setProgress] = useState(0);

  // Use a very small chunk size (16KB) to force many network requests
  const { upload, status, result, error, pause, resume } = useUniversalUpload({
    url: "/upload",
    options: {
      method: "xhr chunked",
      chunkSize: 16 * 1024,
      onProgress: (p) => setProgress(p.percentage),
    },
  });

  const handleRun = () => {
    if (!file) return;
    setProgress(0);
    upload(file);
  };

  return (
    <Card>
      <Card.Title>Small Chunk Stress Test</Card.Title>
      <Card.Description>
        Uses tiny 16KB chunks. Tests the overhead and stability of many
        sequential requests.
      </Card.Description>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleRun} disabled={!file || status === "uploading"}>
          Start Stress Test
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

      {status !== "idle" && (
        <div className="mt-4">
          <Card.ProgressBar
            value={status === "success" ? 100 : progress}
            variant={status === "success" ? "success" : "info"}
          />
          <div className="mt-2 flex gap-2 flex-wrap">
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
            <Badge>{Math.round(progress)}%</Badge>
          </div>
        </div>
      )}

      {error && (
        <Badge variant="error" className="mt-2">
          {error.message}
        </Badge>
      )}
    </Card>
  );
};

export default SmallChunkStressTest;
