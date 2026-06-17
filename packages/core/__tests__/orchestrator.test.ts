import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUploader } from "../src/orchestrator";

// We need to mock the stream helper to control feature detection
vi.mock("../src/stream/helper", () => ({
  checkSupportsStreamingUpload: vi.fn(),
}));

import { checkSupportsStreamingUpload } from "../src/stream/helper";

describe("getUploader (method selection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("'auto' method", () => {
    it("selects 'stream' when streaming is supported", () => {
      vi.mocked(checkSupportsStreamingUpload).mockReturnValue(true);
      const { method } = getUploader("http://localhost:3000/upload", "auto");
      expect(method).toBe("stream");
    });

    it("selects 'xhr chunked' when streaming is not supported", () => {
      vi.mocked(checkSupportsStreamingUpload).mockReturnValue(false);
      const { method } = getUploader("http://localhost:3000/upload", "auto");
      expect(method).toBe("xhr chunked");
    });

    it("defaults to 'auto' when method is undefined", () => {
      vi.mocked(checkSupportsStreamingUpload).mockReturnValue(true);
      const { method } = getUploader("http://localhost:3000/upload", undefined as any);
      expect(method).toBe("stream");
    });
  });

  describe("explicit method selection", () => {
    it("returns 'stream' when explicitly requested", () => {
      const { method } = getUploader("http://localhost:3000/upload", "stream");
      expect(method).toBe("stream");
    });

    it("returns 'stream chunked' when explicitly requested", () => {
      const { method } = getUploader("http://localhost:3000/upload", "stream chunked");
      expect(method).toBe("stream chunked");
    });

    it("returns 'xhr chunked' when explicitly requested", () => {
      const { method } = getUploader("http://localhost:3000/upload", "xhr chunked");
      expect(method).toBe("xhr chunked");
    });

    it("does not call feature detection for explicit methods", () => {
      getUploader("http://localhost:3000/upload", "stream");
      expect(checkSupportsStreamingUpload).not.toHaveBeenCalled();

      getUploader("http://localhost:3000/upload", "xhr chunked");
      expect(checkSupportsStreamingUpload).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws for unsupported method string", () => {
      expect(() =>
        getUploader("http://localhost:3000/upload", "ftp" as any),
      ).toThrow("Unsupported upload method: ftp");
    });
  });

  describe("returned upload function", () => {
    it("returns an upload function alongside the method", () => {
      vi.mocked(checkSupportsStreamingUpload).mockReturnValue(true);
      const { upload } = getUploader("http://localhost:3000/upload", "auto");
      expect(typeof upload).toBe("function");
    });
  });
});
