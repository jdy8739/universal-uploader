import { Card } from "../ui";
import { Button } from "../ui";
import { Log } from "../ui";
import { useState } from "react";
import { useUniversalUpload } from "@usu/react";
import { Badge } from "../ui";

interface RetryAndOnErrorCaseProps {
  file: File | null;
}

export const RetryAndOnErrorCase = ({ file }: RetryAndOnErrorCaseProps) => {
  const [retryCalls, setRetryCalls] = useState(0);
  const [onErrorCalls, setOnErrorCalls] = useState(0);
  const [lastRunMessage, setLastRunMessage] = useState("Not started");

  const { upload, status, error, result } = useUniversalUpload({
    url: "/upload/fail-always",
    options: {
      method: "auto",
      retryCount: 2,
      retryDelay: 300,
      onRetry: () => setRetryCalls((prev) => prev + 1),
      onError: (e) => setOnErrorCalls((prev) => prev + (e ? 1 : 0)),
    },
  });

  const handleRun = async () => {
    if (!file) return;

    setRetryCalls(0);
    setOnErrorCalls(0);
    setLastRunMessage("Running...");

    await upload(file);
    setLastRunMessage("Completed");
  };

  return (
    <Card>
      <Card.Title>Retry + onError Case</Card.Title>
      <Card.Description>
        `/upload/fail-always` endpoint always fails to validate retry exhaust +
        onError callback.
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === "uploading"}>
        Run Retry Scenario
      </Button>
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "retryCalls", value: retryCalls },
            { label: "onErrorCalls", value: onErrorCalls },
            { label: "resultOk", value: result.ok.toString() },
            { label: "message", value: result.message || lastRunMessage },
          ]}
        />
      </Log>
      {error && (
        <Badge variant="error" className="mt-3">
          {error.message}
        </Badge>
      )}
    </Card>
  );
};

export default RetryAndOnErrorCase;
