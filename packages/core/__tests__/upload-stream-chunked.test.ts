import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import uploadWithFetchStreamChunked from "../src/stream-chunked/index";
import type { UploadParamsInternal } from "../src/types";

function makeFile(name = "test.bin", size = 1024, type = "application/octet-stream"): File {
  return new File([new Uint8Array(size)], name, { type });
}

function baseArgs(overrides?: Partial<UploadParamsInternal>): UploadParamsInternal {
  const file = makeFile();
  return {
    url: "http://localhost:3000/upload",
    file,
    refresh: vi.fn(),
    resume: vi.fn(),
    options: { chunkSize: 512 },
    ...overrides,
  };
}

describe("uploadWithFetchStreamChunked", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── chunking basics ────────────────────────────────────
  it("sends multiple chunks for a file larger than chunkSize", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    // 1024 byte file, 512 byte chunks → 2 chunks
    const { result } = await uploadWithFetchStreamChunked(baseArgs());
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns success on all chunks completing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { result } = await uploadWithFetchStreamChunked(baseArgs());
    const r = await result;
    expect(r.ok).toBe(true);
    expect(r.status).toBe("success");
  });

  it("handles single-chunk file (file smaller than chunkSize)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({ file: makeFile("small.bin", 256), options: { chunkSize: 2048 } } as any),
    );
    const r = await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
  });

  // ── error handling ─────────────────────────────────────
  it("rejects when a chunk fails with non-ok status", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { result } = await uploadWithFetchStreamChunked(baseArgs());
    await expect(result).rejects.toThrow("Chunk upload failed with status 500");
  });

  // ── zero-byte file ─────────────────────────────────────
  it("handles zero-byte file — early return without fetch", async () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({ file: makeFile("empty.bin", 0), options: { onProgress, onComplete } } as any),
    );
    const r = await result;
    expect(r.ok).toBe(true);
    expect(r.status).toBe("success");
    expect(onProgress).toHaveBeenCalledWith({ loaded: 0, total: 0, percentage: 100 });
    expect(onComplete).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── progress ───────────────────────────────────────────
  it("fires onProgress with correct loaded/total for each chunk", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const onProgress = vi.fn();
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({ options: { chunkSize: 512, onProgress } } as any),
    );
    await result;
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { loaded: 512, total: 1024, percentage: 50 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { loaded: 1024, total: 1024, percentage: 100 });
  });

  // ── onComplete ─────────────────────────────────────────
  it("fires onComplete only on last chunk", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const onComplete = vi.fn();
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({
        file: makeFile("large.bin", 2048),
        options: { chunkSize: 512, onComplete } as any,
      }),
    );
    await result;
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("passes the fetch Response to onComplete", async () => {
    const res = new Response(null, { status: 200 });
    fetchMock.mockResolvedValue(res);
    const onComplete = vi.fn();
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({ options: { onComplete } } as any),
    );
    await result;
    expect(onComplete).toHaveBeenCalledWith(res);
  });

  // ── headers ────────────────────────────────────────────
  it("includes chunk metadata headers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await uploadWithFetchStreamChunked(baseArgs());
    await new Promise((r) => setTimeout(r, 10));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-Chunk-Index"]).toBe("0");
    expect(init.headers["X-Total-Chunks"]).toBe("2");
  });

  it("includes Content-Type and file-name headers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await uploadWithFetchStreamChunked(baseArgs());
    await new Promise((r) => setTimeout(r, 10));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/octet-stream");
    expect(init.headers["X-File-Name"]).toBe("test.bin");
  });

  it("includes custom headers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await uploadWithFetchStreamChunked(
      baseArgs({ options: { customHeaders: { Authorization: "Bearer t" } } } as any),
    );
    await new Promise((r) => setTimeout(r, 10));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer t");
  });

  // ── withCredentials ────────────────────────────────────
  it("passes withCredentials through to fetch", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await uploadWithFetchStreamChunked(
      baseArgs({ options: { withCredentials: true } } as any),
    );
    await new Promise((r) => setTimeout(r, 10));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
  });

  // ── abort ──────────────────────────────────────────────
  it("abort action stops in-flight fetch", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { actions } = await uploadWithFetchStreamChunked(baseArgs());
    await new Promise((r) => setTimeout(r, 10));
    actions.abort();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal.aborted).toBe(true);
  });

  // ── pause + resume callbacks ────────────────────────────
  it("pause action calls onPause callback", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockReturnValue(new Promise(() => {}));
    const onPause = vi.fn();

    const { actions } = await uploadWithFetchStreamChunked(
      baseArgs({ options: { onPause } } as any),
    );
    await new Promise((r) => setTimeout(r, 10));

    actions.pause();
    expect(onPause).toHaveBeenCalled();
  });

  it("resume action calls onResume callback", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockReturnValue(new Promise(() => {}));
    const onResume = vi.fn();
    const onPause = vi.fn();

    const { actions, result } = await uploadWithFetchStreamChunked(
      baseArgs({ options: { onPause, onResume } } as any),
    );
    await new Promise((r) => setTimeout(r, 10));
    actions.pause();
    await new Promise((r) => setTimeout(r, 10));

    // resume should fire even though we can't complete the upload in mock
    actions.resume();
    expect(onResume).toHaveBeenCalled();
  });

  // ── resume from offset ─────────────────────────────────
  it("resumes from offset when options.offset is set", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { result } = await uploadWithFetchStreamChunked(
      baseArgs({ options: { chunkSize: 512, offset: 512 } } as any),
    );
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-Chunk-Index"]).toBe("1");
  });
});
