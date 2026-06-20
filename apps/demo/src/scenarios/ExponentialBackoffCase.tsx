import React, { useState } from "react";
import { useUniversalUpload } from "@universal-uploader/react";
import { Card, Button, Badge } from "../ui";
import { useI18n } from "../i18n";

interface ExponentialBackoffCaseProps {
  file: File | null;
}

export const ExponentialBackoffCase = ({
  file,
}: ExponentialBackoffCaseProps) => {
  const [retries, setRetries] = useState<{ count: number; delay: number }[]>(
    [],
  );
  const startTime = React.useRef<number>(0);
  const { t } = useI18n();

  const { upload, refresh, status, abort, uploadMethod } = useUniversalUpload({
    url: "/upload/fail-always",
    options: {
      method: "auto",
      retryCount: 3,
      retryDelay: (count) => count * 1000,
      onRetry: () => {
        const now = Date.now();
        const delay = startTime.current ? now - startTime.current : 0;
        setRetries((prev) => [...prev, { count: prev.length + 1, delay }]);
        startTime.current = now;
      },
    },
  });

  const handleRun = () => {
    if (!file) return;
    setRetries([]);
    startTime.current = Date.now();
    upload(file);
  };

  return (
    <Card>
      <Card.Title>{t("test.scenarios.exponentialBackoff.title")}</Card.Title>
      <Card.Description>
        {t("test.scenarios.exponentialBackoff.description")}
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
      <div className="mt-4 space-y-2">
        <Badge variant="info">
          Resolved method: {uploadMethod ?? "pending"}
        </Badge>
        {retries.map((r, i) => (
          <Badge key={i} variant="info">
            Retry #{r.count} triggered after ~{r.delay}ms
          </Badge>
        ))}
        {status === "error" && (
          <Badge variant="error">Final attempt failed.</Badge>
        )}
      </div>
    </Card>
  );
};

export default ExponentialBackoffCase;
