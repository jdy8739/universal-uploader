/**
 * Utility function to wait for a specific duration.
 */
export const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
