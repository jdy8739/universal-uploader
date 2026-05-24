# Universal Stream Uploader

[![npm version](https://img.shields.io/npm/v/@usu/core.svg)](https://www.npmjs.com/package/@usu/core)
[![npm downloads](https://img.shields.io/npm/dm/@usu/core.svg)](https://www.npmjs.com/package/@usu/core)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

High-performance file uploads with Web Streams API, automatic fallbacks, and resumable uploads. < 5 kB gzipped, zero dependencies, 100% TypeScript.

## Three Upload Methods

| Method | HTTP | Memory | Progress | Resumable | Legacy |
|--------|:---:|:---:|:---:|:---:|:---:|
| **Fetch Stream** | 1 | O(1) ✅ | ⚠️ | ❌ | ❌ |
| **Fetch Chunked** | N | O(chunk) ✅ | ✅ | ✅ | ❌ |
| **XHR Chunked** | N | O(chunk) ✅ | ✅ | ✅ | ✅ |

Auto-selects the best method for your browser.

## Installation

```bash
npm install @usu/core @usu/react
# or use @usu/core alone for framework-agnostic usage
```

**NPM Packages:**
- [@usu/core](https://www.npmjs.com/package/@usu/core)
- [@usu/react](https://www.npmjs.com/package/@usu/react)

## Quick Start

### Core
```typescript
import { upload } from '@usu/core';

await upload('/api/upload', file, {
  method: 'auto',
  onProgress: ({ percentage }) => console.log(`${percentage}%`),
  onRetry: () => console.log('Retrying...'),
  retryCount: 3
});
```

### React Hook
```typescript
import { useUniversalUpload } from '@usu/react';

const { upload, pause, resume, status, progress } = useUniversalUpload({
  url: '/api/upload',
  options: { method: 'auto', retryCount: 3 }
});

return (
  <div>
    <input type="file" onChange={(e) => e.target.files && upload(e.target.files[0])} />
    <progress value={progress} max={100} />
    <p>Status: {status}</p>
    {status === 'uploading' && <button onClick={pause}>Pause</button>}
    {status === 'paused' && <button onClick={resume}>Resume</button>}
  </div>
);
```

## Features

- ✅ **Constant Memory** - Web Streams keeps memory O(1) even for multi-GB files
- ✅ **Smart Fallback** - Auto-detects Fetch capabilities, falls back to XHR
- ✅ **Resumable** - Pause and resume with chunked methods
- ✅ **Progress** - Detailed callbacks for all methods
- ✅ **Retry** - Automatic exponential backoff
- ✅ **Controls** - abort(), pause(), resume(), refresh(), retry()
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Tiny** - < 5 kB gzipped, zero dependencies

## Upload Controls

```typescript
const { upload, abort, pause, resume, refresh, retry } = useUniversalUpload({ url });

pause();   // Paused state, can resume
resume();  // Continue from offset
abort();   // Terminal stop, cannot resume
refresh(); // Full restart from initial options
retry(file); // Manual retry
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
  
  onProgress?: (p: { loaded: number; total: number; percentage: number }) => void;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAbort?: () => void;
  throwOnError?: boolean; // Default: false
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

- **[@usu/core](./packages/core/README.md)** - Core upload engine API
- **[@usu/react](./packages/react/README.md)** - React Hook guide
- **[Demo App](./apps/demo)** - Try all methods (두 가지 언어 지원: 한국어, English)

## License

MIT
