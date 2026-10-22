// Keep lock/signal names aligned with mobile/src/lib/browser-session.ts.
// Each frontend has its own bundler root. Only invalidation signals use storage;
// access/refresh tokens and profiles are never persisted there.
export const sessionChangeKey = "eventhub:session-change";
export function publishSessionChange() {
  try {
    localStorage.setItem(sessionChangeKey, crypto.randomUUID());
  } catch {
    // Identity checks after refresh also protect contexts missing this signal.
  }
}

export async function withBrowserRefreshLock<T>(
  work: () => Promise<T>,
): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks)
    throw new Error(
      "Không thể làm mới phiên an toàn. Hãy dùng trình duyệt hỗ trợ Web Locks qua HTTPS hoặc localhost, rồi đăng nhập lại.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    return await navigator.locks.request(
      "eventhub:cookie-refresh",
      { signal: controller.signal },
      async () => {
        clearTimeout(timer);
        // The browser reads the current HttpOnly cookie only AFTER acquiring
        // the lock. Each rotation therefore consumes the preceding rotation.
        return work();
      },
    );
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("Phiên đang được làm mới ở tab khác. Vui lòng thử lại.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
