import { Card } from "../ui";
import { Button } from "../ui";
import { useUniversalUpload } from "@usu/react";
import { Badge } from "../ui";

interface SmallChunkStressTestProps {
  file: File | null;
}

export const SmallChunkStressTest = ({ file }: SmallChunkStressTestProps) => {
  // Use a very small chunk size (16KB) to force many network requests
  const { upload, status, result, error } = useUniversalUpload({
    url: "/upload",
    options: {
      method: "xhr chunked",
      chunkSize: 16 * 1024,
    },
  });

  const handleRun = () => {
    if (!file) return;
    upload(file);
  };

  return (
    <Card>
      <Card.Title>Small Chunk Stress Test</Card.Title>
      <Card.Description>
        Uses tiny 16KB chunks. Tests the overhead and stability of many
        sequential requests.
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === "uploading"}>
        Start Stress Test
      </Button>

      {status !== "idle" && (
        <div className="mt-4">
          <Card.ProgressBar
            value={status === "success" ? 100 : result.total}
            variant={status === "success" ? "success" : "info"}
          />
          <div className="mt-2 flex gap-2">
            <Badge variant={status === 'error' ? 'error' : status === 'success' ? 'success' : 'info'}>
              {status.toUpperCase()}
            </Badge>
            <Badge>{Math.round(result.total)}%</Badge>
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
