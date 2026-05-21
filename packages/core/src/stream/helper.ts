/**
 * Checks if the browser supports ReadableStream upload with Fetch.
 * 브라우저가 Fetch를 통한 ReadableStream 업로드를 지원하는지 확인합니다.
 */
export const checkSupportsStreamingUpload = (url: string) => {
  let duplexAccessed = false;

  const hasContentType = new Request(url, {
    body: new ReadableStream(),
    method: "POST",
    get duplex(): "half" {
      duplexAccessed = true;
      return "half";
    },
  }).headers.has("Content-Type");

  return duplexAccessed && !hasContentType;
};
