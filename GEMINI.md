# Universal Stream Uploader - Project Context

## Core Principles

- **Memory Efficiency**: Always prioritize streaming over buffering. The memory footprint should remain constant regardless of the upload size.
- **Feature Detection**: Use robust feature detection for `ReadableStream` upload support and Fetch Duplex.
- **Transparency**: The fallback mechanism (Fetch vs. XHR) should be transparent to the consumer, but the internal logic must be clear and maintainable.
- **Type Safety**: The library should be written in TypeScript with comprehensive type definitions.

## Tech Stack

- **Language**: TypeScript
- **Target**: Modern Browsers (ES2022+)
- **Build Tool**: TBD (Vite or Rollup suggested for libraries)
- **Testing**: Vitest (suggested for fast, web-compatible testing)

## Key Technical Details

- **Fetch Duplex**: Setting `duplex: 'half'` in fetch options is critical for streaming bodies.
- **ReadableStream to Request Body**: Modern Chrome/Edge support passing a `ReadableStream` directly as the `body` of a `fetch` request.
- **XHR Fallback**: For browsers that don't support streaming uploads, use `xhr.upload.onprogress` with standard buffering.
