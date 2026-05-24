import { Card, Button, Log, Badge } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@universal-uploader/react";
import { useI18n } from "../i18n";

interface ThrowOnErrorCaseProps {
  file: File | null;
}

export const ThrowOnErrorCase = ({ file }: ThrowOnErrorCaseProps) => {
  const [caughtErrorMessage, setCaughtErrorMessage] = useState<string | null>(
    null,
  );
  const [onErrorCalls, setOnErrorCalls] = useState(0);
  const { t } = useI18n();

  const { upload, status, result } = useUniversalUpload({
    url: "/upload/fail-always",
    options: {
      method: "auto",
      retryCount: 0,
      throwOnError: true,
      onError: () => setOnErrorCalls((prev) => prev + 1),
    },
  });

  const handleRun = async () => {
    if (!file) return;

    setCaughtErrorMessage(null);
    setOnErrorCalls(0);

    try {
      await upload(file);
    } catch (e) {
      console.error(e);
      setCaughtErrorMessage((e as Error).message);
    }
  };

  return (
    <Card>
      <Card.Title>{t("test.scenarios.throwOnError.title")}</Card.Title>
      <Card.Description>
        {t("test.scenarios.throwOnError.description")}
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === "uploading"}>
        Run Throw Scenario
      </Button>
      <Log className="mt-4 p-3">
        <Log.Data
          items={[
            { label: "status", value: status },
            { label: "onErrorCalls", value: onErrorCalls },
            { label: "resultOk", value: result.ok.toString() },
            { label: "caughtError", value: caughtErrorMessage || "No throw yet" },
          ]}
        />
      </Log>
      {result.ok && (
        <Badge variant="success" className="mt-3">
          Success: {result.message || "Upload completed"}
        </Badge>
      )}
      {caughtErrorMessage && (
        <Badge variant="error" className="mt-3">
          Caught: {caughtErrorMessage}
        </Badge>
      )}
    </Card>
  );
};

export default ThrowOnErrorCase;
