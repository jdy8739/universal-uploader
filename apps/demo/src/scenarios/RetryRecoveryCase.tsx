import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@universal-uploader/react";
import { useI18n } from "../i18n";

interface RetryRecoveryCaseProps {
  file: File | null;
}

export const RetryRecoveryCase = ({ file }: RetryRecoveryCaseProps) => {
  const [retryCount, setRetryCount] = useState(0);
  const testKey = React.useMemo(
    () => `test-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );
  const { t } = useI18n();

  const { upload, refresh, status, result, error, abort, uploadMethod } = useUniversalUpload({
    url: "/upload/fail-twice-then-success",
    options: {
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
      <Card.Title>{t("test.scenarios.retryRecovery.title")}</Card.Title>
      <Card.Description>
        {t("test.scenarios.retryRecovery.description")}
      </Card.Description>
      <div className="scenario-actions">
        <Button onClick={handleRun} disabled={!file || status === "uploading"}>
          Start Scenario
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
      </div>
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "retries", value: retryCount },
            { label: "resultOk", value: result.ok.toString() },
            { label: "message", value: result.message || "N/A" },
            { label: "uploadMethod", value: uploadMethod ?? "pending" },
          ]}
        />
      </Log>
      {result.ok && (
        <Badge variant="success" className="mt-3">
          Success: {result.message || "Upload completed"}
        </Badge>
      )}
      {(!result.ok || error) && (
        <Badge variant="error" className="mt-3">
          Error: {error?.message || "Upload failed"}
        </Badge>
      )}
    </Card>
  );
};

export default RetryRecoveryCase;
