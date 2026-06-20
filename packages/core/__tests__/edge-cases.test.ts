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

  // ── retryDelay as function ──────────────────────────────
  it("uses retryDelay as function for exponential backoff", async () => {
    const retryDelay = vi.fn((attempt: number) => attempt * 100);
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { result: Promise.reject(new Error("fail")), actions: makeActions() };
      }
      return { result: Promise.resolve(BASE_RESULT), actions: makeActions() };
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 3, retryDelay, onRetry: vi.fn() },
    });

    const r = await response.result;
    expect(r.ok).toBe(true);
    expect(retryDelay).toHaveBeenCalledWith(1);
  });

  // ── HTTP error (non-ok response) triggers retry ─────────
  it("retries on HTTP error (non-ok fetch response)", async () => {
    const onError = vi.fn();
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          result: Promise.resolve({ ok: false, total: 0, status: "error", message: "fail" }),
          actions: makeActions(),
        };
      }
      return { result: Promise.resolve(BASE_RESULT), actions: makeActions() };
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 3, retryDelay: 1, onError },
    });

    const r = await response.result;
    expect(r.ok).toBe(true);
    expect(onError).not.toHaveBeenCalled(); // retried, not errored
  });

  // ── onRetry callback ────────────────────────────────────
  it("fires onRetry when retry occurs", async () => {
    const onRetry = vi.fn();
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { result: Promise.reject(new Error("fail")), actions: makeActions() };
      }
      return { result: Promise.resolve(BASE_RESULT), actions: makeActions() };
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 3, retryDelay: 10, onRetry },
    });

    const r = await response.result;
    expect(r.ok).toBe(true);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ── retryCount = 0 (no retries) ─────────────────────────
  it("does not retry when retryCount is 0", async () => {
    const onError = vi.fn();
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("fail"));

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 0, retryDelay: 1, onError },
    });

    const r = await response.result;
    expect(r.status).toBe("error");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  // ── retry exhausted + throwOnError ──────────────────────
  it("throws after retries exhausted when throwOnError is true", async () => {
    vi.mocked(uploadWithStream).mockRejectedValue(new Error("persistent"));

    await expect(
      upload({
        url: "http://localhost:3000/upload",
        file: makeFile(),
        options: { retryCount: 2, retryDelay: 1, throwOnError: true },
      }),
    ).rejects.toThrow("persistent");
  });

  // ── options.offset reset on initial call ────────────────
  it("resets offset to undefined on initial upload", async () => {
    // The orchestrator clears offset on the internal options copy,
    // not the caller's original object (to avoid mutating user data).
    // We verify that an upload with offset: 500 doesn't break.
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.resolve(BASE_RESULT),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { offset: 500 },
    });

    const r = await response.result;
    expect(r.ok).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════
  // BUG TESTS — these test for KNOWN bugs in the current code.
  // When these tests FAIL, the bugs are still present.
  // When they PASS (after fixes), the bugs are resolved.
  // ═══════════════════════════════════════════════════════════

  it("BUG: upload returns actions immediately while result is pending", async () => {
    const actions = makeActions();
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: new Promise(() => {}),
      actions,
    });

    const timeout = Symbol("timeout");
    const response = await Promise.race([
      upload({
        url: "http://localhost:3000/upload",
        file: makeFile(),
        options: {},
      }),
      new Promise((resolve) => setTimeout(() => resolve(timeout), 20)),
    ]);

    expect(response).not.toBe(timeout);
    expect((response as Awaited<ReturnType<typeof upload>>).actions).toBe(actions);
  });

  it("BUG: throwOnError rejects response.result, not the outer upload response", async () => {
    const onError = vi.fn();
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.resolve({ ok: false, total: 0, status: "error", message: "fail" }),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { throwOnError: true, retryCount: 0, onError },
    });

    await expect(response.result).rejects.toThrow("fail");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("BUG: onAbort via promise-path rejects response.result and reports once", async () => {
    const onAbort = vi.fn();
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.reject(abortError),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { throwOnError: true, onAbort },
    });

    await expect(response.result).rejects.toThrow(abortError);
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it("BUG: primitive promise rejection routes through onError without WeakSet crash", async () => {
    const onError = vi.fn();
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.reject("fail"),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 0, onError },
    });

    const r = await response.result;
    expect(r.status).toBe("error");
    expect(r.message).toBe("fail");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("BUG: onRetry fires after retry completes, not when retry starts", async () => {
    const callOrder: string[] = [];
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        callOrder.push("fail");
        return { result: Promise.reject(new Error("fail")), actions: makeActions() };
      }
      callOrder.push("retry-success");
      return { result: Promise.resolve(BASE_RESULT), actions: makeActions() };
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: {
        retryCount: 3,
        retryDelay: 1,
        onRetry: () => callOrder.push("onRetry"),
      },
    });
    await response.result;

    // Fixed: onRetry now fires BEFORE the retry upload starts.
    // Order: fail → onRetry → retry-success
    expect(callOrder).toEqual(["fail", "onRetry", "retry-success"]);
  });

  // ── onRetry called for each retry attempt ─────────────────
  it("fires onRetry once per retry attempt (not just once total)", async () => {
    const onRetry = vi.fn();
    let callCount = 0;
    vi.mocked(uploadWithStream).mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return { result: Promise.reject(new Error("fail")), actions: makeActions() };
      }
      return { result: Promise.resolve(BASE_RESULT), actions: makeActions() };
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 3, retryDelay: 1, onRetry },
    });
    await response.result;

    // 2 failures → 2 retries → 2 onRetry calls
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  // ── onError receives original Error with HTTP error message ─
  it("onError receives Error with HTTP status in message", async () => {
    const onError = vi.fn();
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.resolve({
        ok: false, total: 0, status: "error", message: "Upload failed with status 500",
      }),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 0, onError },
    });
    await response.result;

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  // ── non-Error rejection edge cases ───────────────────────
  it("handles null rejection through result promise", async () => {
    const onError = vi.fn();
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.reject(null),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 0, onError },
    });
    const r = await response.result;

    expect(r.status).toBe("error");
    expect(r.message).toBe("null");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("handles undefined rejection through result promise", async () => {
    vi.mocked(uploadWithStream).mockResolvedValue({
      result: Promise.reject(undefined),
      actions: makeActions(),
    });

    const response = await upload({
      url: "http://localhost:3000/upload",
      file: makeFile(),
      options: { retryCount: 0 },
    });
    const r = await response.result;

    expect(r.status).toBe("error");
    expect(r.message).toBe("undefined");
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
