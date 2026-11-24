import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

/**
 * Keep the screen from dimming/locking while `active` is true.
 * Browsers drop the lock whenever the tab is hidden, so it's re-requested when
 * the page becomes visible again. Silently does nothing where unsupported.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!active || !nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        // The browser may release it on its own (tab hidden, battery saver).
        (lock as unknown as EventTarget).addEventListener?.("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Denied (e.g. low battery) — nothing to do.
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) void sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
