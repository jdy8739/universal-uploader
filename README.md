# Universal Stream Uploader

A lightweight, zero-dependency library for high-performance file uploads using Web Streams API with progress monitoring and cross-browser fallbacks.

## The Problem

Modern web applications face a fragmentation between `fetch` and `XHR`:
- **Fetch API**: Supports streaming (Fetch Duplex) but lacks built-in progress monitoring for uploads.
- **XHR (XMLHttpRequest)**: Supports progress monitoring but does not support streaming, leading to high memory consumption (O(n)) when handling large files as they often need to be fully loaded into memory.

## Core Features

- **Zero-copy Processing**: Utilizes `ReadableStream` and `TransformStream` to process data in chunks, keeping the memory footprint constant regardless of file size.
- **Fetch Duplex**: Leverages the latest browser capabilities for full-duplex streaming.
- **Unified Interface**: Provides a single Promise-based API that abstracts away the complexity of choosing between Fetch and XHR.
- **Progress Monitoring**: Exposes a precise `onProgress` callback even when using streams.
- **Smart Fallback**: Automatically detects browser capabilities and falls back to XHR when streaming is not supported, ensuring wide compatibility without changing implementation code.
- **Minimalistic**: Replaces 40+ lines of cross-browser boilerplate with a clean, functional interface.

## Goal

To provide a robust solution for uploading multi-gigabyte files while maintaining browser runtime stability and a superior developer experience (DX).

## Installation

```bash
npm install universal-stream-uploader
```

## Quick Start

```javascript
import { upload } from 'universal-stream-uploader';

const file = fileInput.files[0];

await upload('/api/upload', file, {
  onProgress: ({ loaded, total, percentage }) => {
    console.log(`Upload progress: ${percentage}%`);
  }
});
```

## License

MIT
