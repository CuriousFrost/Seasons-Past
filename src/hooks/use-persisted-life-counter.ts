import { useEffect, useRef } from "react";

/**
 * Save/restore the Life Counter's game in this browser so a refresh, an
 * accidental back-swipe, or the OS killing the tab doesn't wipe the table.
 * Per account (key includes the uid) and per device; storage failures
 * (private mode, blocked site data) just mean no resume.
 */

const VERSION = 1;

function storageKey(uid: string) {
  return `sp.lifeCounter.v${VERSION}.${uid}`;
}

export function loadSavedLifeCounter<T>(uid: string | undefined): T | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Debounced save of `state` whenever it changes. */
export function usePersistLifeCounter<T>(uid: string | undefined, state: T) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(state);
  latestRef.current = state;

  useEffect(() => {
    if (!uid) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(uid), JSON.stringify(latestRef.current));
      } catch {
        // ignore — quota or blocked storage
      }
    }, 300);
  }, [uid, state]);

  // Flush immediately when the page is being hidden or closed, so a quick
  // reload right after a tap still has the latest totals.
  useEffect(() => {
    if (!uid) return;
    function flush() {
      try {
        localStorage.setItem(storageKey(uid!), JSON.stringify(latestRef.current));
      } catch {
        // ignore
      }
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [uid]);
}
