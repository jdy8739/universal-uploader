import { Card } from "../ui";
import { Button } from "../ui";
import { Log } from "../ui";
import React, { useState } from "react";
import { useUniversalUpload } from "@usu/react";

interface ThrowOnErrorCaseProps {
  file: File | null;
}

export const ThrowOnErrorCase = ({ file }: ThrowOnErrorCaseProps) => {
  const [caughtErrorMessage, setCaughtErrorMessage] = useState<string | null>(
    null,
  );
  const [onErrorCalls, setOnErrorCalls] = useState(0);

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
      <Card.Title>throwOnError=true Case</Card.Title>
      <Card.Description>
        `/upload/fail-always` endpoint always fails. This scenario should throw.
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === "uploading"}>
        Run Throw Scenario
      </Button>
      <Log className="mt-4 p-3">
        <Log.Data items={[
          { label: 'status', value: status },
          { label: 'onErrorCalls', value: onErrorCalls },
          { label: 'resultOk', value: result.ok.toString() },
          { label: 'caughtError', value: caughtErrorMessage || "No throw yet" },
        ]} />
      </Log>
    </Card>
  );
};

export default ThrowOnErrorCase;
