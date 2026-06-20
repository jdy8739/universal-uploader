# @universal-uploader/core

[![npm version](https://img.shields.io/npm/v/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)

**[📦 NPM](https://www.npmjs.com/package/@universal-uploader/core)** | **[🔗 Main README](../../README.md)** | **[⚛️ React](../react)**

Core file upload orchestrator. Three adaptive strategies, one unified API.

## Quick Start

```typescript
import upload from '@universal-uploader/core';

// Auto-selects the best strategy (stream → XHR fallback)
const { result, uploadMethod } = await upload({
  url: '/api/upload',
  file,
  options: { retryCount: 3 },
});
```

### Tree-Shakable Strategy Injection

```typescript
import upload from '@universal-uploader/core/base';
import { UPLOAD_WITH_STREAM } from '@universal-uploader/core/stream';

await upload({ url, file, options: { strategy: UPLOAD_WITH_STREAM } });
```

Available strategy exports:

| Export | Subpath | Description |
|--------|---------|-------------|
| `UPLOAD_AUTO` | `/auto` | Auto-select at runtime (orchestrator) |
| `UPLOAD_WITH_STREAM` | `/stream` | Fetch streaming (O(1) memory) |
| `UPLOAD_WITH_FETCH_STREAM_CHUNKED` | `/stream-chunked` | Fetch chunked (resumable) |
| `UPLOAD_WITH_XHR_CHUNKED` | `/xhr-chunked` | XHR chunked (legacy support) |

## Three Upload Methods

### 1. Fetch Stream (1 request, O(1) memory)
Perfect for small/medium files on modern browsers.
```typescript
import upload from '@universal-uploader/core/base';
import { UPLOAD_WITH_STREAM } from '@universal-uploader/core/stream';

const { result } = await upload({
  url: '/api/upload',
  file,
  options: { strategy: UPLOAD_WITH_STREAM },
});
```

### 2. Fetch Chunked (N requests, resumable)
Best for large files with precise progress and resumption.
```typescript
import { UPLOAD_WITH_FETCH_STREAM_CHUNKED } from '@universal-uploader/core/stream-chunked';

const { result } = await upload({
  url: '/api/upload',
  file,
  options: {
    strategy: UPLOAD_WITH_FETCH_STREAM_CHUNKED,
    chunkSize: 1024 * 1024, // 1MB
    onProgress: (p) => console.log(p.percentage),
  },
});
```

### 3. XHR Chunked (N requests, legacy support)
Broadest compatibility with byte-level progress.
```typescript
import { UPLOAD_WITH_XHR_CHUNKED } from '@universal-uploader/core/xhr-chunked';

const { result } = await upload({
  url: '/api/upload',
  file,
  options: {
    strategy: UPLOAD_WITH_XHR_CHUNKED,
    chunkSize: 512 * 1024,
  },
});
```

### Auto-Select (Default)
```typescript
import upload from '@universal-uploader/core';

const { result, uploadMethod } = await upload({
  url: '/api/upload',
  file,
  options: {},
});

console.log(uploadMethod); // 'stream' | 'stream chunked' | 'xhr chunked'
```

## Configuration

```typescript
interface UploadOptions {
  chunkSize?: number; // Default: 512KB
  retryCount?: number; // Default: 3
  retryDelay?: number | ((attempt: number) => number);
  customHeaders?: Record<string, string>;
  withCredentials?: boolean;
  offset?: number;
  strategy?: (args: UploadParamsInternal) => Promise<UploadResponse>; // v2: inject strategy directly
  
  onProgress?: (p: { loaded: number; total: number; percentage: number }) => void;
  onComplete?: (response?: Response) => void;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAbort?: (error: DOMException) => void;
  throwOnError?: boolean | ((error: unknown) => boolean);
}
```

## Upload Controls

```typescript
const { result, actions } = await upload({ url, file, options });
const { abort, pause, resume, refresh } = actions;

pause();   // Status: "paused" (resumable)
resume();  // Continue from offset
abort();   // Status: "aborted" (terminal)
refresh(); // Full restart from initial options
```

## Browser Support

- Chrome/Edge: Fetch Stream ✅
- Firefox: Fetch Stream ✅
- Safari/IE: XHR Fallback ✅

## Testing

111 vitest tests, all passing.

```bash
pnpm test   # vitest run
```

| # | Test file | Tests |
|:--|-----------|:-----:|
| 1 | `helper.test.ts` | 28 |
| 2 | `orchestrator.test.ts` | 9 |
| 3 | `upload-stream.test.ts` | 13 |
| 4 | `upload-stream-chunked.test.ts` | 16 |
| 5 | `upload-xhr-chunked.test.ts` | 15 |
| 6 | `edge-cases.test.ts` | 30 |
|   | **Total** | **111** |

Test environment: **jsdom** via vitest. No browser required.

## License

MIT
