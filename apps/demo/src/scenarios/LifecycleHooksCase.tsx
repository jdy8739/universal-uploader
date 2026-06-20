import React, { useState } from 'react';
import { useUniversalUpload } from '@universal-uploader/react';
import { Card, Button, Log } from '../ui';
import { useI18n } from '../i18n';

interface LifecycleHooksCaseProps {
  file: File | null;
}

export const LifecycleHooksCase = ({ file }: LifecycleHooksCaseProps) => {
  const [events, setEvents] = useState<string[]>([]);
  const { t } = useI18n();

  const addEvent = (msg: string) => {
    setEvents((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const { upload, refresh, abort, status, pause, resume, uploadMethod } = useUniversalUpload({
    url: '/upload',
    options: {
      onComplete: () => addEvent('✅ Complete'),
      onAbort: () => addEvent('🛑 Aborted'),
      onError: (err) => addEvent(`❌ Error: ${err.message}`),
      onPause: () => addEvent('⏸️ Paused'),
      onResume: () => addEvent('▶️ Resumed'),
      onProgress: (p) => {
        if (p.percentage === 0 || p.percentage === 100) {
            addEvent(`📊 Progress: ${p.percentage}%`);
        }
      }
    },
  });

  return (
    <Card>
      <Card.Title>{t("test.scenarios.lifecycleHooks.title")}</Card.Title>
      <Card.Description>
        {t("test.scenarios.lifecycleHooks.description")}
      </Card.Description>
      <div className="flex gap-2 mb-4">
        <Button onClick={() => file && upload(file)} disabled={!file || status === "uploading"}>
          Start
        </Button>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={status === "idle"}
        >
          Refresh
        </Button>
        <Button variant="outline" onClick={abort} disabled={status !== 'uploading' && status !== 'paused'}>
          Abort
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
      <Log className="h-24 overflow-y-auto">
        {events.length === 0 && <span className="opacity-50 italic">Waiting for events...</span>}
        {events.map((ev, i) => (
          <Log.Entry key={i}>{ev}</Log.Entry>
        ))}
        <Log.Entry>Resolved method: {uploadMethod ?? "pending"}</Log.Entry>
      </Log>
    </Card>
  );
};

export default LifecycleHooksCase;
