import React, { useState } from 'react';
import { useUniversalUpload } from '@usu/react';
import { Card, Button, Badge } from '../ui';

interface ExponentialBackoffCaseProps {
  file: File | null;
}

export const ExponentialBackoffCase = ({ file }: ExponentialBackoffCaseProps) => {
  const [retries, setRetries] = useState<{ count: number; delay: number }[]>([]);
  const startTime = React.useRef<number>(0);

  const { upload, status } = useUniversalUpload({
    url: '/upload/fail-always',
    options: {
      method: 'auto',
      retryCount: 3,
      // Exponential backoff: 200ms, 400ms, 800ms...
      retryDelay: (count) => Math.pow(2, count) * 100,
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
      <Card.Title>Exponential Backoff Case</Card.Title>
      <Card.Description>
        Tests functional `retryDelay`. Delays increase exponentially with each attempt.
      </Card.Description>
      <Button onClick={handleRun} disabled={!file || status === 'uploading'}>
        Run Backoff Scenario
      </Button>
      <div className="mt-4 space-y-2">
        {retries.map((r, i) => (
          <Badge key={i} variant="info">
            Retry #{r.count} triggered after ~{r.delay}ms
          </Badge>
        ))}
        {status === 'error' && (
          <Badge variant="error">
            Final attempt failed.
          </Badge>
        )}
      </div>
    </Card>
  );
};

export default ExponentialBackoffCase;
