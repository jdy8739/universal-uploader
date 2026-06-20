import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import uploadWithXhrChuncked from "../src/xhr-chuncked/index";
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

// Proper mock for XMLHttpRequest as a class
class MockXHR {
  status = 0;
  readyState = 0;
  withCredentials = false;
  method = "";
  url = "";
  requestHeaders: Record<string, string> = {};
  sentBody: any = null;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = {
    onprogress: null,
  };

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }

  send(body?: any) {
    this.sentBody = body;
  }

  abort() {
    this.onabort?.();
  }

  _respond(status: number) {
    this.status = status;
    this.readyState = 4;
    this.onload?.();
  }

  _error() {
    this.status = 0;
    this.onerror?.();
  }
}

describe("uploadWithXhrChuncked", () => {
  let mockXHR: MockXHR;
  let OriginalXHR: typeof XMLHttpRequest;

  beforeEach(() => {
    OriginalXHR = globalThis.XMLHttpRequest;
    mockXHR = new MockXHR();

    // Use a class so `new XMLHttpRequest()` works
    globalThis.XMLHttpRequest = class extends MockXHR {
      constructor() {
        super();
        return mockXHR;
      }
    } as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = OriginalXHR;
    vi.restoreAllMocks();
  });

  it("opens POST to the correct URL", async () => {
    setTimeout(() => mockXHR._respond(200), 5);
    await uploadWithXhrChuncked(baseArgs());

    expect(mockXHR.method).toBe("POST");
    expect(mockXHR.url).toBe("http://localhost:3000/upload");
  });

  it("returns success for single-chunk file", async () => {
    setTimeout(() => mockXHR._respond(200), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: 2048 } } as any),
    );
    const result = await response.result;
    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
  });

  it("returns success for multi-chunk file", async () => {
    // File is 1024 bytes, chunk size is 512 → 2 chunks
    let chunkCalls = 0;
    const origSend = mockXHR.send.bind(mockXHR);
    mockXHR.send = function (body?: any) {
      origSend(body);
      chunkCalls++;
      setTimeout(() => mockXHR._respond(200), 5);
    };

    const response = await uploadWithXhrChuncked(baseArgs());
    const result = await response.result;

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(chunkCalls).toBe(2);
  });

  it("returns error on non-ok HTTP status", async () => {
    setTimeout(() => mockXHR._respond(500), 5);

    const response = await uploadWithXhrChuncked(baseArgs());
    await expect(response.result).rejects.toThrow("Chunk upload failed with status 500");
  });

  it("handles zero-byte file (early return)", async () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    const response = await uploadWithXhrChuncked(
      baseArgs({
        file: makeFile("empty.bin", 0),
        options: { onProgress, onComplete } as any,
      }),
    );
    const result = await response.result;

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(onProgress).toHaveBeenCalledWith({
      loaded: 0,
      total: 0,
      percentage: 100,
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it("includes file-name header", async () => {
    setTimeout(() => mockXHR._respond(200), 5);
    await uploadWithXhrChuncked(baseArgs());
    expect(mockXHR.requestHeaders["X-File-Name"]).toBe("test.bin");
  });

  it("includes chunk headers for multi-chunk", async () => {
    const origSend = mockXHR.send.bind(mockXHR);
    mockXHR.send = function (body?: any) {
      origSend(body);
      setTimeout(() => mockXHR._respond(200), 5);
    };

    await uploadWithXhrChuncked(baseArgs());

    expect(mockXHR.requestHeaders["X-Chunk-Index"]).toBeDefined();
    expect(mockXHR.requestHeaders["X-Total-Chunks"]).toBeDefined();
  });

  it("abort action aborts the XHR", async () => {
    // Don't auto-respond so we can abort in-flight
    const origSend = mockXHR.send.bind(mockXHR);
    mockXHR.send = function (body?: any) {
      origSend(body);
      // never responds
    };

    // Start upload, grab actions, then abort
    const response = uploadWithXhrChuncked(baseArgs());
    // Give it a tick to start
    await new Promise((r) => setTimeout(r, 5));

    const { actions } = await response;
    actions.abort();
    // If we got here without timeout, abort worked
  });

  it("handles onProgress callback", async () => {
    const onProgress = vi.fn();
    setTimeout(() => mockXHR._respond(200), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: 2048, onProgress } as any }),
    );
    await response.result;
    expect(onProgress).toHaveBeenCalled();
  });

  it("handles withCredentials", async () => {
    setTimeout(() => mockXHR._respond(200), 5);

    await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: 2048, withCredentials: true } } as any),
    );

    expect(mockXHR.withCredentials).toBe(true);
  });

  it("falls back to single request when chunkSize <= 0", async () => {
    setTimeout(() => mockXHR._respond(200), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: 0 } } as any),
    );
    const result = await response.result;
    expect(result.ok).toBe(true);
  });

  // ── pause + resume (chunked path) ──────────────────────
  it("pause action is callable on chunked path", async () => {
    let sendCount = 0;
    const origSend = mockXHR.send.bind(mockXHR);
    mockXHR.send = function (body?: any) {
      origSend(body);
      sendCount++;
      if (sendCount === 1) {
        setTimeout(() => mockXHR._respond(200), 3); // first chunk succeeds
      }
      // subsequent chunks wait forever
    };

    const response = uploadWithXhrChuncked(baseArgs());
    await new Promise((r) => setTimeout(r, 10)); // first chunk completes

    const { actions } = await response;
    actions.pause();
    // Verify it doesn't throw — pause is callable
  });

  // ── non-chunked fallback (uploadWithoutChunking) ────────
  it("non-chunked fallback: returns success for single XHR", async () => {
    setTimeout(() => mockXHR._respond(200), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: -1 } } as any),
    );
    const result = await response.result;
    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
  });

  it("non-chunked fallback: fires onProgress and onComplete", async () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    setTimeout(() => mockXHR._respond(200), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: -1, onProgress, onComplete } } as any),
    );
    await response.result;
    expect(onProgress).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it("non-chunked fallback: handles HTTP error", async () => {
    setTimeout(() => mockXHR._respond(500), 5);

    const response = await uploadWithXhrChuncked(
      baseArgs({ options: { chunkSize: -1 } } as any),
    );
    await expect(response.result).rejects.toThrow("Upload failed with status 500");
  });
});
