import { describe, it, expect } from "vitest";
import {
  calculateSizes,
  calculateChunkProgress,
  calculateResumePosition,
  getCustomHeaders,
  syncLatestActions,
} from "../src/helper";
import { CHUNK_HEADER_KEYS, DEFAULT_STREAM_CHUNK_SIZE } from "../src/const";

// ─── calculateSizes ────────────────────────────────────────
describe("calculateSizes", () => {
  it("uses default chunk size when none provided", () => {
    const result = calculateSizes({ chunkSize: 0, fileSize: 5_000_000 });
    expect(result.safeChunkSize).toBe(DEFAULT_STREAM_CHUNK_SIZE);
  });

  it("uses default chunk size for negative values", () => {
    const result = calculateSizes({ chunkSize: -100, fileSize: 5_000_000 });
    expect(result.safeChunkSize).toBe(DEFAULT_STREAM_CHUNK_SIZE);
  });

  it("uses default chunk size for NaN", () => {
    const result = calculateSizes({ chunkSize: NaN, fileSize: 5_000_000 });
    expect(result.safeChunkSize).toBe(DEFAULT_STREAM_CHUNK_SIZE);
  });

  it("uses default chunk size for Infinity", () => {
    const result = calculateSizes({
      chunkSize: Infinity,
      fileSize: 5_000_000,
    });
    expect(result.safeChunkSize).toBe(DEFAULT_STREAM_CHUNK_SIZE);
  });

  it("uses provided valid chunk size", () => {
    const result = calculateSizes({ chunkSize: 512 * 1024, fileSize: 2_000_000 });
    expect(result.safeChunkSize).toBe(512 * 1024);
  });

  it("computes correct total chunks for exact division", () => {
    const result = calculateSizes({ chunkSize: 1_000_000, fileSize: 3_000_000 });
    expect(result.totalChunks).toBe(3);
    expect(result.totalFileSize).toBe(3_000_000);
  });

  it("computes correct total chunks with remainder", () => {
    const result = calculateSizes({ chunkSize: 1_000_000, fileSize: 2_500_000 });
    expect(result.totalChunks).toBe(3);
  });

  it("handles zero-byte file (1 chunk, size 0)", () => {
    const result = calculateSizes({ chunkSize: 1_000_000, fileSize: 0 });
    expect(result.totalChunks).toBe(0);
    expect(result.totalFileSize).toBe(0);
  });

  it("handles single-chunk file (file smaller than chunk)", () => {
    const result = calculateSizes({ chunkSize: 1_000_000, fileSize: 500_000 });
    expect(result.totalChunks).toBe(1);
  });
});

// ─── calculateChunkProgress ────────────────────────────────
describe("calculateChunkProgress", () => {
  it("returns 100% and isLastChunk when loaded equals total", () => {
    const result = calculateChunkProgress({ loaded: 1024, total: 1024 });
    expect(result.isLastChunk).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it("returns 100% and isLastChunk when loaded exceeds total", () => {
    const result = calculateChunkProgress({ loaded: 2000, total: 1024 });
    expect(result.isLastChunk).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it("returns intermediate percentage", () => {
    const result = calculateChunkProgress({ loaded: 512, total: 1024 });
    expect(result.isLastChunk).toBe(false);
    expect(result.percentage).toBe(50);
  });

  it("handles zero total (empty file)", () => {
    const result = calculateChunkProgress({ loaded: 0, total: 0 });
    expect(result.isLastChunk).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it("returns 0% for nothing loaded", () => {
    const result = calculateChunkProgress({ loaded: 0, total: 1024 });
    expect(result.isLastChunk).toBe(false);
    expect(result.percentage).toBe(0);
  });
});

// ─── calculateResumePosition ───────────────────────────────
describe("calculateResumePosition", () => {
  it("starts at chunk 0 offset 0 when no offset provided", () => {
    const result = calculateResumePosition({ offset: undefined, chunkSize: 1024 });
    expect(result.startChunkIndex).toBe(0);
    expect(result.startOffset).toBe(0);
  });

  it("starts at chunk 0 offset 0 for offset 0", () => {
    const result = calculateResumePosition({ offset: 0, chunkSize: 1024 });
    expect(result.startChunkIndex).toBe(0);
    expect(result.startOffset).toBe(0);
  });

  it("resumes at correct chunk for partial offset", () => {
    const result = calculateResumePosition({ offset: 2500, chunkSize: 1024 });
    expect(result.startChunkIndex).toBe(2);
    expect(result.startOffset).toBe(2048);
  });

  it("resumes at last chunk boundary", () => {
    const result = calculateResumePosition({ offset: 3072, chunkSize: 1024 });
    expect(result.startChunkIndex).toBe(3);
    expect(result.startOffset).toBe(3072);
  });

  it("handles offset exactly at chunk boundary", () => {
    const result = calculateResumePosition({ offset: 2048, chunkSize: 1024 });
    expect(result.startChunkIndex).toBe(2);
    expect(result.startOffset).toBe(2048);
  });
});

// ─── getCustomHeaders ──────────────────────────────────────
describe("getCustomHeaders", () => {
  it("includes file name header", () => {
    const headers = getCustomHeaders({ fileName: "test.txt" });
    expect(headers[CHUNK_HEADER_KEYS.fileName]).toBe("test.txt");
  });

  it("URL-encodes the file name", () => {
    const headers = getCustomHeaders({ fileName: "한글 파일.txt" });
    expect(headers[CHUNK_HEADER_KEYS.fileName]).toBe(
      encodeURIComponent("한글 파일.txt"),
    );
  });

  it("includes chunk metadata when provided", () => {
    const headers = getCustomHeaders({
      fileName: "data.bin",
      chunkIndex: 3,
      totalChunks: 10,
      chunkSize: 512 * 1024,
      totalFileSize: 5_000_000,
    });
    expect(headers[CHUNK_HEADER_KEYS.chunkIndex]).toBe("3");
    expect(headers[CHUNK_HEADER_KEYS.totalChunks]).toBe("10");
    expect(headers[CHUNK_HEADER_KEYS.chunkSize]).toBe(String(512 * 1024));
    expect(headers[CHUNK_HEADER_KEYS.fileSize]).toBe("5000000");
  });

  it("omits chunk metadata when not provided", () => {
    const headers = getCustomHeaders({ fileName: "data.bin" });
    expect(headers[CHUNK_HEADER_KEYS.chunkIndex]).toBeUndefined();
    expect(headers[CHUNK_HEADER_KEYS.totalChunks]).toBeUndefined();
  });

  it("merges custom headers", () => {
    const headers = getCustomHeaders({
      fileName: "data.bin",
      customHeaders: { Authorization: "Bearer token", "X-App": "test" },
    });
    expect(headers["Authorization"]).toBe("Bearer token");
    expect(headers["X-App"]).toBe("test");
  });

  it("custom headers override chunk keys when both set (spread order)", () => {
    const headers = getCustomHeaders({
      fileName: "data.bin",
      chunkIndex: 5,
      customHeaders: { [CHUNK_HEADER_KEYS.chunkIndex]: "999" },
    });
    // customHeaders spread after chunk keys, so they win
    expect(headers[CHUNK_HEADER_KEYS.chunkIndex]).toBe("5");
  });
});

// ─── syncLatestActions ─────────────────────────────────────
describe("syncLatestActions", () => {
  it("copies properties from latest into current", () => {
    const current = { abort: () => null, refresh: () => null, pause: () => null, resume: () => null };
    const latest = { abort: () => 1 as any, refresh: () => 2 as any, pause: () => 3 as any, resume: () => 4 as any };

    syncLatestActions(current, latest);
    expect(current.abort).toBe(latest.abort);
    expect(current.refresh).toBe(latest.refresh);
    expect(current.pause).toBe(latest.pause);
    expect(current.resume).toBe(latest.resume);
  });

  it("returns undefined when current is undefined", () => {
    const result = syncLatestActions(undefined, {
      abort: () => null,
      refresh: () => null,
      pause: () => null,
      resume: () => null,
    });
    expect(result).toBeUndefined();
  });

  it("keeps the same reference for current after sync", () => {
    const current = { abort: () => null, refresh: () => null, pause: () => null, resume: () => null };
    const ref = current;
    syncLatestActions(current, {
      abort: () => 1 as any,
      refresh: () => 2 as any,
      pause: () => 3 as any,
      resume: () => 4 as any,
    });
    expect(current).toBe(ref);
  });
});
