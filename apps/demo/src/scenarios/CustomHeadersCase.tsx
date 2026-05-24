import { useUniversalUpload } from "@usu/react";
import { Card, Button, Badge } from "../ui";

interface CustomHeadersCaseProps {
  file: File | null;
}

export const CustomHeadersCase = ({ file }: CustomHeadersCaseProps) => {
  const { upload, status, pause, resume } = useUniversalUpload({
    url: "/upload",
    options: {
      method: "auto",
      customHeaders: {
        Authorization: "Bearer demo-token-123",
        "X-Client-Version": "1.0.0",
        "X-Purpose": "Demo Testing",
      },
    },
  });

  return (
    <Card>
      <Card.Title>Custom Headers Case</Card.Title>
      <Card.Description>
        Tests sending metadata via `customHeaders` (e.g., Auth, Versioning).
      </Card.Description>
      <div className="flex gap-2 flex-wrap mb-4">
        <Button
          onClick={() => file && upload(file)}
          disabled={!file || status === "uploading"}
        >
          Upload with Headers
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

      {status === "success" && (
        <div className="mt-4">
          <Badge variant="success">
            Success! Check network tab to verify headers:
            <ul className="mt-1 list-disc list-inside opacity-80">
              <li>Authorization: Bearer ...</li>
              <li>X-Client-Version: 1.0.0</li>
            </ul>
          </Badge>
        </div>
      )}
    </Card>
  );
};

export default CustomHeadersCase;
