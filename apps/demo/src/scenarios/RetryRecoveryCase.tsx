import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@usu/react";

interface RetryRecoveryCaseProps {
  file: File | null;
}

export const RetryRecoveryCase = ({ file }: RetryRecoveryCaseProps) => {
  const [retryCount, setRetryCount] = useState(0);
  const testKey = React.useMemo(
    () => `test-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  const { upload, status, result, error } = useUniversalUpload({
    url: "/upload/fail-twice-then-success",
    options: {
      method: "auto",
      retryCount: 3,
      retryDelay: 200,
      customHeaders: {
        "x-test-key": testKey,
      },
      onRetry: () => setRetryCount((prev) => prev + 1),
    },
  });

  const handleRun = () => {
    if (!file) return;
    setRetryCount(0);
    upload(file);
  };

  return (
    <Card>
      <Card.Title>Retry Recovery Case</Card.Title>
      <Card.Description>
        Fails twice then succeeds. Tests `retryCount`, `onRetry`, and
        `customHeaders`.
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === "uploading"}>
        Run Recovery Scenario
      </Button>
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "retries", value: retryCount },
            { label: "resultOk", value: result.ok.toString() },
            { label: "message", value: result.message || "N/A" },
          ]}
        />
      </Log>
      {result.ok && (
        <Badge variant="success" className="mt-3">
          Success: {result.message || "Upload completed"}
        </Badge>
      )}
      {error && (
        <Badge variant="error" className="mt-3">
          Error: {error.message}
        </Badge>
      )}
    </Card>
  );
};

export default RetryRecoveryCase;
