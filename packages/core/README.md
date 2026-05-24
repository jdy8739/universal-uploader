# @universal-uploader/core

[![npm version](https://img.shields.io/npm/v/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)

**[📦 NPM](https://www.npmjs.com/package/@universal-uploader/core)** | **[🔗 Main README](../README.md)** | **[⚛️ React](./packages/react)**

Core file upload orchestrator. Three adaptive strategies, one unified API.

## Three Upload Methods

### 1. Fetch Stream (1 request, O(1) memory)
Perfect for small/medium files on modern browsers.
```typescript
await upload('/api/upload', file, { method: 'stream' });
```

### 2. Fetch Chunked (N requests, resumable)
Best for large files with precise progress and resumption.
```typescript
await upload('/api/upload', file, {
  method: 'stream chunked',
  chunkSize: 1024 * 1024, // 1MB
  onProgress: (p) => console.log(p.percentage)
});
```

### 3. XHR Chunked (N requests, legacy support)
Broadest compatibility with byte-level progress.
```typescript
await upload('/api/upload', file, {
  method: 'xhr chunked',
  chunkSize: 512 * 1024
});
```

### Auto-Select (Default)
```typescript
await upload('/api/upload', file, {
  method: 'auto' // Fetch Stream → Fetch Chunked → XHR Chunked
});
```

## Installation

```bash
npm install @universal-uploader/core
yarn add @usu/core
pnpm add @usu/core
```

NPM: https://www.npmjs.com/package/@universal-uploader/core

## Upload Control

```typescript
const { upload, pause, resume, abort, refresh, retry } = await upload(url, file, options);

pause();   // Status: "paused" (resumable)
resume();  // Continue from offset
abort();   // Status: "aborted" (terminal)
refresh(); // Full restart from initial options
retry(file); // Manual retry
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
  onProgress?: (p: { loaded: number; total: number; percentage: number }) => void;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  throwOnError?: boolean; // false default
}
```

## Types

```typescript
import type {
  UploadResult,    // { ok: boolean; total: number; status: 'success' | 'error' | ... }
  UploadStatus,    // 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'aborted'
  UploadOptions,
  UploadParams
} from '@usu/core';
```

## Error Handling

```typescript
// Automatic retry with exponential backoff
await upload('/api/upload', file, {
  retryCount: 5,
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000
});

// Throw on error
try {
  await upload('/api/upload', file, { throwOnError: true });
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
