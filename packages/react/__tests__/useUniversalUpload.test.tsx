import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@universal-uploader/core/base", () => ({
  default: vi.fn(),
}));

import useUniversalUpload from "../src/useUniversalUpload";
import uploadCore from "@universal-uploader/core/base";
import type { UploadResult, UploadActions } from "@universal-uploader/core";

const mockUploadCore = uploadCore as ReturnType<typeof vi.fn>;

function makeActions(overrides?: Partial<UploadActions>): UploadActions {
  return {
    abort: vi.fn(),
    refresh: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ...overrides,
  };
}

function makeResult(overrides?: Partial<UploadResult>): UploadResult {
  return { ok: true, total: 1024, status: "success", ...overrides };
}

function makeResponse(result: UploadResult, method = "stream") {
  return {
    result: Promise.resolve(result),
    actions: makeActions(),
    uploadMethod: method,
  };
}

describe("useUniversalUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initial state ───────────────────────────────────────
  it("returns idle as initial status", () => {
    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.uploadMethod).toBeUndefined();
  });

  it("returns control functions", () => {
    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );
    expect(typeof result.current.upload).toBe("function");
    expect(typeof result.current.abort).toBe("function");
    expect(typeof result.current.pause).toBe("function");
    expect(typeof result.current.resume).toBe("function");
  });

  // ── successful upload ───────────────────────────────────
  it("transitions to success on upload completion", async () => {
    mockUploadCore.mockResolvedValue(makeResponse(makeResult()));

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.status).toBe("success");
  });

  it("exposes the uploadMethod after upload", async () => {
    mockUploadCore.mockResolvedValue(makeResponse(makeResult(), "xhr chunked"));

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.uploadMethod).toBe("xhr chunked");
  });

  // ── error handling ──────────────────────────────────────
  it("transitions to error on upload failure", async () => {
    mockUploadCore.mockResolvedValue(
      makeResponse({ ok: false, total: 0, message: "err", status: "error" }),
    );

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBeTruthy();
  });

  it("catches thrown errors from uploadCore", async () => {
    mockUploadCore.mockRejectedValue(new Error("Fatal error"));

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("Fatal error");
  });

  it("re-throws when throwOnError is true", async () => {
    mockUploadCore.mockRejectedValue(new Error("Fatal"));

    const { result } = renderHook(() =>
      useUniversalUpload({
        url: "http://localhost:3000/upload",
        options: { throwOnError: true },
      }),
    );

    await expect(
      act(async () => {
        await result.current.upload(new File([], "test.bin"));
      }),
    ).rejects.toThrow("Fatal");
  });

  // ── abort / pause ───────────────────────────────────────
  it("transitions to aborted", async () => {
    mockUploadCore.mockResolvedValue(
      makeResponse({
        ok: false,
        total: 0,
        message: "aborted",
        status: "aborted",
      }),
    );

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.status).toBe("aborted");
  });

  it("transitions to paused status", async () => {
    mockUploadCore.mockResolvedValue(
      makeResponse({ ok: false, total: 0, status: "paused" }),
    );

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    await act(async () => {
      await result.current.upload(new File([], "test.bin"));
    });

    expect(result.current.status).toBe("paused");
  });

  // ── race condition — new upload cancels old ─────────────
  it("aborts previous upload when a new one starts", async () => {
    const abort1 = vi.fn();
    const abort2 = vi.fn();

    mockUploadCore.mockResolvedValueOnce({
      result: new Promise(() => {}),
      actions: {
        abort: abort1,
        refresh: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      uploadMethod: "stream",
    });

    mockUploadCore.mockResolvedValueOnce({
      result: Promise.resolve(makeResult()),
      actions: {
        abort: abort2,
        refresh: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      uploadMethod: "stream",
    });

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "old.bin"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.upload(new File([], "new.bin"));
    });

    expect(abort1).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
  });

  it("does not let an older uploadCore rejection overwrite newer success", async () => {
    let rejectOld!: (error: Error) => void;
    mockUploadCore
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
      )
      .mockResolvedValueOnce({
        result: Promise.resolve(makeResult()),
        actions: makeActions(),
        uploadMethod: "stream",
      });

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "old.bin"));
    });

    await act(async () => {
      await result.current.upload(new File([], "new.bin"));
    });
    expect(result.current.status).toBe("success");

    await act(async () => {
      rejectOld(new Error("old failed"));
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
  });

  // ── cleanup on unmount ──────────────────────────────────
  it("aborts in-flight upload on unmount", async () => {
    const abortFn = vi.fn();

    mockUploadCore.mockResolvedValue({
      result: new Promise(() => {}),
      actions: {
        abort: abortFn,
        refresh: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      uploadMethod: "stream",
    });

    const { result, unmount } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "hang.bin"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(abortFn).toHaveBeenCalledTimes(1);
  });

  // ── action calls (abort/refresh/pause/resume) ──────────
  it("abort action calls the core abort function during in-flight upload", async () => {
    const abortFn = vi.fn();
    mockUploadCore.mockResolvedValue({
      result: new Promise(() => {}),
      actions: {
        abort: abortFn,
        refresh: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
      uploadMethod: "stream",
    });

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "test.bin"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.abort();
    });

    expect(abortFn).toHaveBeenCalledTimes(1);
  });

  it("pause and resume actions are callable during in-flight upload", async () => {
    const pauseFn = vi.fn();
    const resumeFn = vi.fn();
    mockUploadCore.mockResolvedValue({
      result: new Promise(() => {}),
      actions: {
        abort: vi.fn(),
        refresh: vi.fn(),
        pause: pauseFn,
        resume: resumeFn,
      },
      uploadMethod: "stream",
    });

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "test.bin"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.pause();
    });
    expect(pauseFn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resume();
    });
    expect(resumeFn).toHaveBeenCalledTimes(1);
  });

  it("refresh action calls core refresh during in-flight upload", async () => {
    const refreshFn = vi.fn();
    mockUploadCore.mockResolvedValue({
      result: new Promise(() => {}),
      actions: {
        abort: vi.fn(),
        refresh: refreshFn,
        pause: vi.fn(),
        resume: vi.fn(),
      },
      uploadMethod: "stream",
    });

    const { result } = renderHook(() =>
      useUniversalUpload({ url: "http://localhost:3000/upload" }),
    );

    act(() => {
      result.current.upload(new File([], "test.bin"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.refresh();
    });

    expect(refreshFn).toHaveBeenCalledTimes(1);
  });

  // ── throwOnError with result rejection ──────────────────
  it("re-throws from result promise when throwOnError is true", async () => {
    mockUploadCore.mockResolvedValue({
      result: Promise.reject(new Error("Fatal")),
      actions: makeActions(),
      uploadMethod: "stream",
    });

    const { result } = renderHook(() =>
      useUniversalUpload({
        url: "http://localhost:3000/upload",
        options: { throwOnError: true },
      }),
    );

    await expect(
      act(async () => {
        await result.current.upload(new File([], "test.bin"));
      }),
    ).rejects.toThrow("Fatal");
  });
});
