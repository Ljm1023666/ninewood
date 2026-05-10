export function useThrottle(fn: (...args: any[]) => void, delay = 200) {
  let last = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - last >= delay) { last = now; fn(...args); }
  };
}
