import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/stream/helper", () => ({
  checkSupportsStreamingUpload: vi.fn(() => true),
}));

vi.mock("../src/stream", () => ({ default: vi.fn() }));
vi.mock("../src/stream-chunked", () => ({ default: vi.fn() }));
vi.mock("../src/xhr-chuncked", () => ({ default: vi.fn() }));

import upload from "../src/index";
import uploadWithStream from "../src/stream";
import type { UploadResult, UploadActions } from "../src/types";

function makeActions(overrides?: Partial<UploadActions>): UploadActions {
  return {
    abort: vi.fn(),
    refresh: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ...overrides,
  };
}

function makeFile(name = "test.bin", size = 1024, type = "application/octet-stream"): File {
  return new File([new Uint8Array(size)], name, { type });
}

const BASE_RESULT: UploadResult = { ok: true, total: 1024, status: "success" };

describe("upload orchestrator — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── zero-byte file ──────────────────────────────────────
  it("handles zero-byte file", async () => {
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.resolve({ ok: true, total: 0, status: "success" }),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile("empty.bin", 0),
      options: {},
    });

    const r = await response.result;
    expect(r.status).toBe("success");
    expect(r.total).toBe(0);
  });

  // ── abort ───────────────────────────────────────────────
  it("returns aborted on DOMException AbortError", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    const r = await response.result;
    expect(r.status).toBe("aborted");
    expect(r.ok).toBe(false);
  });

  it("fires onAbort callback", async () => {
    const onAbort = vi.fn();
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(uploadWithStream).mockRejectedValue(abortError);

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { onAbort },
    });

    await response.result;
    expect(onAbort).toHaveBeenCalledWith(abortError);
  });

  it("throws on abort when throwOnError is true", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(uploadWithStream).mockRejectedValue(abortError);

    await expect(
      upload({
        url: "http://localhost:3000/upload",
        file: makeFile(),
        options: { throwOnError: true },
      }),
    ).rejects.toThrow();
  });

  // ── generic error ───────────────────────────────────────
  it("returns error status on generic Error", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("Network failure"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    const r = await response.result;
    expect(r.status).toBe("error");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Network failure");
  });

  it("fires onError callback", async () => {
    const onError = vi.fn();
    const err = new Error("Boom");
    vi.mocked(uploadWithStream).mockRejectedValue(err);

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { onError },
    });

    await response.result;
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("wraps non-Error throws", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue("plain string");

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    const r = await response.result;
    expect(r.message).toBe("Unknown upload error");
  });

  it("throwOnError as function: throws when returns true", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("fail"));

    await expect(
      upload({
        url: "http://localhost:3000/upload",
        file: makeFile(),
        options: { throwOnError: (e) => (e as Error).message === "fail" },
      }),
    ).rejects.toThrow("fail");
  });

  it("throwOnError as function: does not throw when returns false", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("fail"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { throwOnError: () => false },
    });

    const r = await response.result;
    expect(r.status).toBe("error");
  });

  // ── retry ───────────────────────────────────────────────
  it("retries on failure and succeeds", async () => {
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          result: Promise.reject(new Error("fail")),
          actions: makeActions(),
        };
      }
      return {
        result: Promise.resolve(BASE_RESULT),
        actions: makeActions(),
      };
    });

    const onRetry = vi.fn();
    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 3, retryDelay: 10, onRetry },
    });

    const r = await response.result;
    expect(r.ok).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it("gives up after retries exhausted", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("persistent fail"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 2, retryDelay: 10 },
    });

    const r = await response.result;
    expect(r.status).toBe("error");
  });

  // ── uploadMethod return ─────────────────────────────────
  it("includes uploadMethod on success", async () => {
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.resolve(BASE_RESULT),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    expect(response.uploadMethod).toBe("stream");
  });

  it("includes uploadMethod on failure", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("fail"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    expect(response.uploadMethod).toBe("stream");
    const r = await response.result;
    expect(r.status).toBe("error");
  });

  // ── actions are returned ────────────────────────────────
  it("returns stub actions on error", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("fail"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {},
    });

    expect(response.actions).toBeDefined();
    expect(typeof response.actions.abort).toBe("function");
    expect(typeof response.actions.refresh).toBe("function");
    expect(typeof response.actions.pause).toBe("function");
    expect(typeof response.actions.resume).toBe("function");
  });
});
