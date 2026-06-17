import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the stream uploader by mocking global fetch
import uploadWithStream from "../src/stream/index";
import type { UploadParamsInternal, UploadResponse } from "../src/types";

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
    options: { chunkSize: 512 * 1024 },
    ...overrides,
  };
}

describe("uploadWithStream", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with POST method and duplex half", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    await uploadWithStream(baseArgs());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/upload");
    expect(init.method).toBe("POST");
    expect(init.duplex).toBe("half");
  });

  it("includes content-type and file-name headers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await uploadWithStream(baseArgs());

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/octet-stream");
    expect(init.headers["X-File-Name"]).toBe("test.bin");
  });

  it("returns success result on 200", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const response = await uploadWithStream(baseArgs());
    const result = await response.result;

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(result.total).toBe(1024);
  });

  it("returns error result on non-ok status", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 500, statusText: "Server Error" }),
    );

    const response = await uploadWithStream(baseArgs());
    const result = await response.result;

    expect(result.ok).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toContain("500");
  });

  it("fires onComplete on success", async () => {
    const onComplete = vi.fn();
    const res = new Response(null, { status: 200 });
    fetchMock.mockResolvedValue(res);

    const { result } = await uploadWithStream(
      baseArgs({ options: { onComplete } } as Partial<UploadParamsInternal> as any),
    );
    await result;

    expect(onComplete).toHaveBeenCalledWith(res);
  });

  it("does not fire onComplete on failure", async () => {
    const onComplete = vi.fn();
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = await uploadWithStream(
      baseArgs({ options: { onComplete } } as Partial<UploadParamsInternal> as any),
    );
    await result;

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("handles zero-byte file", async () => {
    const onProgress = vi.fn();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = await uploadWithStream(
      baseArgs({
        file: makeFile("empty.bin", 0),
        options: { onProgress } as any,
      }),
    );
    await result;

    expect(onProgress).toHaveBeenCalledWith({
      loaded: 0,
      total: 0,
      percentage: 100,
    });
  });

  it("includes custom headers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await uploadWithStream(
      baseArgs({
        options: {
          customHeaders: { Authorization: "Bearer test" },
        } as any,
      }),
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer test");
  });

  it("abort action triggers AbortController", async () => {
    // Don't resolve fetch so we can abort while in-flight
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { actions } = await uploadWithStream(baseArgs());
    actions.abort();

    // The fetch call's signal should be aborted
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal.aborted).toBe(true);
  });
});
