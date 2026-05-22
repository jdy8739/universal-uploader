import React, { useState } from 'react';
import { useUniversalUpload } from '@usu/react';
import { Card, Button, Log } from '../ui';

interface LifecycleHooksCaseProps {
  file: File | null;
}

export const LifecycleHooksCase = ({ file }: LifecycleHooksCaseProps) => {
  const [events, setEvents] = useState<string[]>([]);

  const addEvent = (msg: string) => {
    setEvents((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const { upload, abort, status } = useUniversalUpload({
    url: '/upload',
    options: {
      method: 'auto',
      onComplete: () => addEvent('✅ Complete'),
      onAbort: () => addEvent('🛑 Aborted'),
      onError: (err) => addEvent(`❌ Error: ${err.message}`),
      onProgress: (p) => {
        if (p.percentage === 0 || p.percentage === 100) {
            addEvent(`📊 Progress: ${p.percentage}%`);
        }
      }
    },
  });

  return (
    <Card>
      <Card.Title>Lifecycle Hooks Case</Card.Title>
      <Card.Description>
        Logs events from `onComplete`, `onAbort`, and `onProgress`.
      </Card.Description>
      <div className="flex gap-2 mb-4">
        <Button onClick={() => file && upload(file)} disabled={!file || status === 'uploading'}>
          Start
        </Button>
        <Button variant="outline" onClick={abort} disabled={status !== 'uploading'}>
          Abort
        </Button>
      </div>
      <Log className="h-24 overflow-y-auto">
        {events.length === 0 && <span className="opacity-50 italic">Waiting for events...</span>}
        {events.map((ev, i) => (
          <Log.Entry key={i}>{ev}</Log.Entry>
        ))}
      </Log>
    </Card>
  );
};

export default LifecycleHooksCase;
