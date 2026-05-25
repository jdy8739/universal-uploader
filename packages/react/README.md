# @universal-uploader/react

[![npm version](https://img.shields.io/npm/v/@universal-uploader/react.svg)](https://www.npmjs.com/package/@universal-uploader/react)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/react.svg)](https://www.npmjs.com/package/@universal-uploader/react)

**[📦 NPM](https://www.npmjs.com/package/@universal-uploader/react)** | **[🔗 Main README](../../README.md)** | **[⚙️ Core](../core)**

React Hook wrapper for @universal-uploader/core. Minimal, powerful, type-safe.

## Installation

```bash
npm install @universal-uploader/react
yarn add @universal-uploader/react
pnpm add @universal-uploader/react
```

NPM Packages:
- [@universal-uploader/react](https://www.npmjs.com/package/@universal-uploader/react)
- [@universal-uploader/core](https://www.npmjs.com/package/@universal-uploader/core)

## Quick Start

```typescript
import { useUniversalUpload } from '@universal-uploader/react';
import { useState } from 'react';

export const Upload = () => {
  const [progress, setProgress] = useState(0);
  
  const { upload, pause, resume, abort, status, uploadMethod, result, error } = useUniversalUpload({
    url: '/api/upload',
    options: { 
      method: 'auto', 
      retryCount: 3,
      onProgress: (p) => setProgress(Math.round(p.percentage))
    }
  });

  const handleUpload = async (file: File) => {
    await upload(file);
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
        disabled={status === 'uploading'}
      />
      <progress value={progress} max={100} />
      <p>Status: {status}</p>
      <p>Method: {uploadMethod ?? 'pending'}</p>
      
      {status === 'uploading' && (
        <>
          <button onClick={pause}>Pause</button>
          <button onClick={abort}>Abort</button>
        </>
      )}
      
      {status === 'paused' && (
        <button onClick={resume}>Resume</button>
      )}
      
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </div>
  );
};
```

## Hook API

```typescript
const {
  upload,     // (file: File) => Promise<UploadResult>
  pause,      // () => void
  resume,     // () => void
  abort,      // () => void
  retry,      // (file: File) => Promise<UploadResult> (alias for upload)
  
  status,     // 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'aborted'
  uploadMethod, // 'stream' | 'stream chunked' | 'xhr chunked' | undefined
  result,     // { ok: boolean; total: number; status: ... }
  error       // Error | null
} = useUniversalUpload({ url, options });
```

## Control Semantics

```typescript
pause();   // → status: "paused" (resumable)
resume();  // → continues from offset
abort();   // → status: "aborted" (terminal)
retry(file); // → alias for upload(file)
```

## Configuration

```typescript
interface UseUniversalUploadConfig {
  url: string;
  options?: {
    method?: 'stream' | 'stream chunked' | 'xhr chunked' | 'auto';
    chunkSize?: number; // 512KB default
    retryCount?: number; // 3 default
    retryDelay?: number | ((attempt: number) => number);
    customHeaders?: Record<string, string>;
    withCredentials?: boolean;
    onProgress?: (p: { loaded: number; total: number; percentage: number }) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
    onRetry?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onAbort?: (error: DOMException) => void;
    throwOnError?: boolean | ((error: unknown) => boolean);
  };
}
```

## Examples

### With Error Recovery
```typescript
const { upload, retry, error } = useUniversalUpload({ url });

const handleUpload = async (file: File) => {
  try {
    await upload(file);
  } catch (err) {
    console.error(err);
  }
};

return (
  <>
    {error && <button onClick={() => retry(file)}>Retry</button>}
  </>
);
```

### Lifecycle Hooks
```typescript
const { upload } = useUniversalUpload({
  url: '/api/upload',
  options: {
    onProgress: ({ percentage }) => console.log(`${percentage}%`),
    onError: (err) => console.error('❌', err),
    onRetry: () => console.log('🔄 Retrying'),
    onPause: () => console.log('⏸️ Paused'),
    onResume: () => console.log('▶️ Resumed'),
    onAbort: (err) => console.log('❌ Aborted', err)
  }
});
```

### Multiple Files
```typescript
export const MultiUpload = ({ files }: { files: File[] }) => {
  return (
    <div className="grid">
      {files.map((file) => (
        <UploadCard key={file.name} file={file} />
      ))}
    </div>
  );
};
```

## Type Safety

```typescript
import type {
  UploadStatus,
  UploadResult,
  OnProgressParams,
  UploadOptions
} from '@universal-uploader/core';
```

## Browser Support

- Chrome/Edge: Fetch Stream ✅
- Firefox: Fetch Stream ✅
- Safari/IE: XHR Fallback ✅

## License

MIT
