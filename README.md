# Universal Stream Uploader

[![npm version](https://img.shields.io/npm/v/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

High-performance file uploads with Web Streams API, automatic fallbacks, and resumable uploads. < 10 kB gzipped, zero dependencies, 100% TypeScript.

## Three Upload Methods

| Method | HTTP | Memory | Progress | Resumable | Legacy |
|--------|:---:|:---:|:---:|:---:|:---:|
| **Fetch Stream** | 1 | O(1) ✅ | ⚠️ | ❌ | ❌ |
| **Fetch Chunked** | N | O(chunk) ✅ | ✅ | ✅ | ❌ |
| **XHR Chunked** | N | O(chunk) ✅ | ✅ | ✅ | ✅ |

Auto-selects the best method for your browser.

## Installation

```bash
npm install @universal-uploader/core
# or use @universal-uploader/react for React hook version
yarn add @universal-uploader/core
pnpm add @universal-uploader/core
```

**NPM Packages:**
- [@universal-uploader/core](https://www.npmjs.com/package/@universal-uploader/core)
- [@universal-uploader/react](https://www.npmjs.com/package/@universal-uploader/react)

## Quick Start

### Core
```typescript
import upload from '@universal-uploader/core';

const { result, actions } = await upload('/api/upload', file, {
  method: 'auto',
  onProgress: ({ percentage }) => console.log(`${percentage}%`),
  onRetry: () => console.log('Retrying...'),
  retryCount: 3
});
```

### React Hook
```typescript
import { useState } from 'react';
import { useUniversalUpload } from '@universal-uploader/react';

export const Upload = () => {
  const [progress, setProgress] = useState(0);
  
  const { upload, pause, resume, abort, status, result, error } = useUniversalUpload({
    url: '/api/upload',
    options: { 
      method: 'auto', 
      retryCount: 3,
      onProgress: (p) => setProgress(Math.round(p.percentage))
    }
  });

  return (
    <div>
      <input type="file" onChange={(e) => e.target.files && upload(e.target.files[0])} />
      <progress value={progress} max={100} />
      <p>Status: {status}</p>
      {status === 'uploading' && (
        <>
          <button onClick={pause}>Pause</button>
          <button onClick={abort}>Abort</button>
        </>
      )}
      {status === 'paused' && <button onClick={resume}>Resume</button>}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </div>
  );
};
```

## Features

- ✅ **Constant Memory** - Web Streams keeps memory O(1) even for multi-GB files
- ✅ **Smart Fallback** - Auto-detects Fetch capabilities, falls back to XHR
- ✅ **Resumable** - Pause and resume with chunked methods
- ✅ **Progress** - Detailed callbacks for all methods
- ✅ **Retry** - Automatic exponential backoff
- ✅ **Controls** - abort(), pause(), resume(), refresh(), retry()
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Tiny** - < 10 kB gzipped, zero dependencies

> 📚 **[Interactive Guide & Documentation](https://jdy8739.github.io/universal-uploader/)** - Full documentation with examples (한국어, English)

## Upload Controls

```typescript
const { result, actions } = await upload(url, file, options);
const { abort, pause, resume, refresh } = actions;

pause();   // Status: "paused" (resumable)
resume();  // Continue from offset
abort();   // Status: "aborted" (terminal)
refresh(); // Full restart from initial options
```

## Configuration

```typescript
interface UploadOptions {
  method?: 'stream' | 'stream chunked' | 'xhr chunked' | 'auto';
  chunkSize?: number; // Default: 512KB
  retryCount?: number; // Default: 3
  retryDelay?: number | ((attempt: number) => number);
  customHeaders?: Record<string, string>;
  withCredentials?: boolean;
  offset?: number;
  
  onProgress?: (p: { loaded: number; total: number; percentage: number }) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAbort?: (error: DOMException) => void;
  throwOnError?: boolean | ((error: unknown) => boolean); // Default: false
}
```

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ Fetch Stream |
| Firefox | ✅ Fetch Stream |
| Safari | ✅ XHR Fallback |
| IE 11+ | ✅ XHR Fallback |

## Documentation

- **[Online Documentation](https://jdy8739.github.io/universal-uploader/)** - Interactive guide (한국어, English)
- **[@universal-uploader/core](./packages/core/README.md)** - Core upload engine API
- **[@universal-uploader/react](./packages/react/README.md)** - React Hook guide
- **[Demo Source](./apps/demo)** - Demo app code

## License

MIT
