# @universal-uploader/core

[![npm version](https://img.shields.io/npm/v/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)

**[📦 NPM](https://www.npmjs.com/package/@universal-uploader/core)** | **[🔗 Main README](../README.md)** | **[⚛️ React](../react)**

Core file upload orchestrator. Three adaptive strategies, one unified API.

## Three Upload Methods

### 1. Fetch Stream (1 request, O(1) memory)
Perfect for small/medium files on modern browsers.
```typescript
const { result } = await upload('/api/upload', file, { method: 'stream' });
```

### 2. Fetch Chunked (N requests, resumable)
Best for large files with precise progress and resumption.
```typescript
const { result } = await upload('/api/upload', file, {
  method: 'stream chunked',
  chunkSize: 1024 * 1024, // 1MB
  onProgress: (p) => console.log(p.percentage)
});
```

### 3. XHR Chunked (N requests, legacy support)
Broadest compatibility with byte-level progress.
```typescript
const { result } = await upload('/api/upload', file, {
  method: 'xhr chunked',
  chunkSize: 512 * 1024
});
```

### Auto-Select (Default)
```typescript
const { result, uploadMethod } = await upload('/api/upload', file, {
  method: 'auto' // Resolves to 'stream' or 'xhr chunked' based on browser support
});

console.log(uploadMethod); // 'stream' | 'stream chunked' | 'xhr chunked'
```

## Installation

```bash
npm install @universal-uploader/core
yarn add @universal-uploader/core
pnpm add @universal-uploader/core
```

NPM: https://www.npmjs.com/package/@universal-uploader/core

## Upload Control

```typescript
const { result, actions, uploadMethod } = await upload(url, file, options);
const { abort, pause, resume, refresh } = actions;

console.log(uploadMethod); // Resolved upload strategy (never 'auto')

pause();   // Status: "paused" (resumable)
resume();  // Continue from offset
abort();   // Status: "aborted" (terminal)
refresh(); // Full restart from initial options
```

## Configuration

```typescript
interface UploadOptions {
  method?: 'stream' | 'stream chunked' | 'xhr chunked' | 'auto';
  chunkSize?: number; // 512KB default
  retryCount?: number; // 3 default
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
  throwOnError?: boolean | ((error: unknown) => boolean); // false default
}
```

## Types

```typescript
import type {
  UploadResult,           // { ok: boolean; total: number; status: 'success' | 'error' | ... }
  UploadStatus,           // 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'aborted'
  UploadMethod,           // 'auto' | 'stream' | 'stream chunked' | 'xhr chunked'
  UploadResponseWithMethod, // UploadResponse & { uploadMethod: UploadMethod }
  OnProgressParams,       // { loaded: number; total: number; percentage: number }
  UploadOptions,
  UploadParams
} from '@universal-uploader/core';
```

## Error Handling

```typescript
// Automatic retry with exponential backoff
const { result } = await upload('/api/upload', file, {
  retryCount: 5,
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000
});

// Throw on error
try {
  const { result } = await upload('/api/upload', file, { throwOnError: true });
} catch (err) {
  console.error(err);
}
```

## Browser Support

- Chrome/Edge: Fetch Stream ✅
- Firefox: Fetch Stream ✅
- Safari/IE: XHR Fallback (auto-detected) ✅

## Performance

- < 10 kB gzipped
- Zero dependencies
- 100% TypeScript
- Constant memory (Stream) or bounded (Chunked)

## License

MIT
