/**
 * Utility function to wait for a specific duration.
 * 지정된 시간만큼 대기하기 위한 유틸리티 함수입니다.
 */
export const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
