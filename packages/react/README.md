# @universal-uploader/react

[![npm version](https://img.shields.io/npm/v/@universal-uploader/react.svg)](https://www.npmjs.com/package/@universal-uploader/react)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/react.svg)](https://www.npmjs.com/package/@universal-uploader/react)

**[📦 NPM](https://www.npmjs.com/package/@universal-uploader/react)** | **[🔗 Main README](../../README.md)** | **[⚙️ Core](./packages/core)**

React Hook wrapper for @usu/core. Minimal, powerful, type-safe.

## Installation

```bash
npm install @universal-uploader/react @universal-uploader/core
yarn add @usu/react @usu/core
pnpm add @usu/react @usu/core
```

NPM Packages:
- [@universal-uploader/react](https://www.npmjs.com/package/@universal-uploader/react)
- [@universal-uploader/core](https://www.npmjs.com/package/@universal-uploader/core)

## Quick Start

```typescript
import { useUniversalUpload } from '@usu/react';

export const Upload = () => {
  const { upload, pause, resume, status, progress, error } = useUniversalUpload({
    url: '/api/upload',
    options: { method: 'auto', retryCount: 3 }
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
      
      {status === 'uploading' && (
        <>
          <button onClick={pause}>Pause</button>
          <button onClick={() => /* abort */}>Abort</button>
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
  refresh,    // () => void
  retry,      // (file: File) => Promise<UploadResult>
  
  status,     // 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'aborted'
  progress,   // 0-100
  result,     // { ok: boolean; total: number; status: ... }
  error       // Error | null
} = useUniversalUpload({ url, options });
```

## Control Semantics

```typescript
pause();   // → status: "paused" (resumable)
resume();  // → continues from offset
abort();   // → status: "aborted" (terminal)
refresh(); // → full restart from initial options
retry(file); // → manual retry
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
    onError?: (error: Error) => void;
    onRetry?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onAbort?: () => void;
    throwOnError?: boolean;
  };
  onUrlChange?: (url: string) => void;
  onMethodChange?: (method: UploadMethod) => void;
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
    onComplete: () => console.log('✅ Done'),
    onError: (err) => console.error('❌', err),
    onRetry: () => console.log('🔄 Retrying'),
    onPause: () => console.log('⏸️ Paused'),
    onResume: () => console.log('▶️ Resumed')
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
  UploadOptions,
  UploadMethod
} from '@usu/react';
```

## Browser Support

- Chrome/Edge: Fetch Stream ✅
- Firefox: Fetch Stream ✅
- Safari/IE: XHR Fallback ✅

## License

MIT
