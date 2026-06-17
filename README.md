# Universal Stream Uploader

[![npm version](https://img.shields.io/npm/v/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![npm downloads](https://img.shields.io/npm/dm/@universal-uploader/core.svg)](https://www.npmjs.com/package/@universal-uploader/core)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-82%20passing-brightgreen)](./packages)

High-performance file uploads with Web Streams API, automatic fallbacks, and resumable uploads. < 10 kB gzipped, zero dependencies, 100% TypeScript.

## Project Structure

```
universal-upload/
├── server.ts              # Express test/upload server
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose service
├── tsconfig.server.json   # TypeScript config for server
├── packages/
│   ├── core/              # @universal-uploader/core — upload engine
│   │   ├── src/           # TypeScript source
│   │   ├── __tests__/     # 71 vitest tests (5 files)
│   │   └── vitest.config.ts
│   └── react/             # @universal-uploader/react — React hook
│       ├── src/           # TypeScript source
│       ├── __tests__/     # 11 vitest tests (1 file)
│       └── vitest.config.ts
├── apps/
│   └── demo/              # Vite demo app (한국어, English)
└── configs/               # Shared build configs
```

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

const { result, actions } = await upload({
  url: '/api/upload',
  file,
  options: {
    method: 'auto',
    onProgress: ({ percentage }) => console.log(`${percentage}%`),
    onRetry: () => console.log('Retrying...'),
    retryCount: 3,
  },
});
```

### React Hook
```typescript
import { useState } from 'react';
import { useUniversalUpload } from '@universal-uploader/react';

export const Upload = () => {
  const [progress, setProgress] = useState(0);
  
  const { upload, pause, resume, abort, refresh, status, uploadMethod, result, error } = useUniversalUpload({
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
      <p>Method: {uploadMethod ?? 'pending'}</p>
      {status === 'uploading' && (
        <>
          <button onClick={pause}>Pause</button>
          <button onClick={abort}>Abort</button>
        </>
      )}
      {status === 'paused' && <button onClick={resume}>Resume</button>}
      {(status === 'error' || status === 'aborted') && (
        <button onClick={refresh}>Restart</button>
      )}
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
- ✅ **Retry** - Automatic exponential backoff (`retryCount`, `retryDelay`, `onRetry`)
- ✅ **Controls** - `abort()`, `pause()`, `resume()`, `refresh()` (`retry` deprecated in React hook)
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Tiny** - < 10 kB gzipped, zero dependencies

> 📚 **[Interactive Guide & Documentation](https://jdy8739.github.io/universal-uploader/)** - Full documentation with examples (한국어, English)

## Upload Controls

```typescript
const { result, actions } = await upload({ url, file, options });
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
  onComplete?: (response?: Response) => void; // Response for 'stream'/'stream chunked'; undefined for 'xhr chunked' & empty files

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
## Docker (Test Server)

The included Express server (`server.ts`) runs the upload endpoints used for integration testing. Run it in Docker for consistent environments:

```bash
# Build and start
docker compose up -d

# Check health
curl http://localhost:3000/health
# → {"status":"ok"}

# View logs
docker compose logs -f

# Stop
docker compose down
```

**Runtime config** (all environment-variable driven):

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `3000` | Server port |
| `UPLOAD_DIR` | `/uploads` | Directory for uploaded files |

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Standard upload |
| POST | `/upload/fail-always` | Always returns 500 |
| POST | `/upload/fail-twice-then-success` | Fails twice, succeeds on 3rd attempt |
| POST | `/upload/fail-at-chunk-3` | Fails on 3rd chunk attempt |
| POST | `/upload/reset-test-counters` | Reset failure counters |

The Docker image uses a **multi-stage build** — TypeScript compilation in stage 1, slim production runtime in stage 2. HEALTHCHECK monitors the `/health` endpoint every 30 seconds.

## Testing

82 vitest tests across 2 packages, zero failures.

```bash
# Core: 71 tests (5 files) — upload engine, helpers, orchestrator, edge cases
pnpm --filter @universal-uploader/core test

# React: 11 tests (1 file) — hook lifecycle, state transitions, race conditions
pnpm --filter @universal-uploader/react test

# Watch mode
pnpm --filter @universal-uploader/core test:watch
```

**Test coverage by package:**

| Package | Files | Tests | Covers |
|---------|:-----:|:-----:|--------|
| `@universal-uploader/core` | 5 | 71 | helper utils, orchestrator, edge cases (zero-byte, abort, retry), stream upload, XHR chunked |
| `@universal-uploader/react` | 1 | 11 | idle state, success/error/abort/pause transitions, uploadMethod, throwOnError, stale-upload cleanup, unmount abort |

Test environment: **jsdom** via vitest. No browser required.

## Development Quick Start

```bash
# Install deps
pnpm install

# Run server locally
npx tsx server.ts

# Run all tests
pnpm --filter @universal-uploader/core test && pnpm --filter @universal-uploader/react test

# Build
pnpm build-libs
```



## Documentation

- **[Online Documentation](https://jdy8739.github.io/universal-uploader/)** - Interactive guide (한국어, English)
- **[@universal-uploader/core](./packages/core/README.md)** - Core upload engine API
- **[@universal-uploader/react](./packages/react/README.md)** - React Hook guide
- **[Demo Source](./apps/demo)** - Demo app code

## License

MIT
