import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";

const cache = createCache<string[]>();

export function usePodBuddies() {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [podBuddies, setPodBuddies] = useState<string[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const persistBuddies = useCallback(
    async (updated: string[]) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { podBuddies: updated },
          { merge: true },
        );
      } catch (err) {
        setError("Failed to save pod buddies. Please try again.");
        console.error("persistBuddies error:", err);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) {
      setPodBuddies([]);
      setError(null);
      setLoading(false);
      return;
    }
    const userUid = user.uid;

    if (cache.get(userUid)) {
      setPodBuddies(cache.get(userUid)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadBuddies() {
      try {
        const snap = await getDoc(doc(db, "users", userUid));
        if (!cancelled) {
          const data = snap.data();
          const loaded = data?.podBuddies ?? [];
          setPodBuddies(loaded);
          cache.set(userUid, loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load pod buddies.");
          console.error("loadBuddies error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBuddies();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addBuddy = useCallback(
    async (name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      // Case-insensitive duplicate check
      const lower = trimmed.toLowerCase();
      if (podBuddies.some((b) => b.toLowerCase() === lower)) return;

      const updated = [...podBuddies, trimmed];
      setPodBuddies(updated);
      cache.set(user.uid, updated);
      await persistBuddies(updated);
    },
    [podBuddies, persistBuddies, user],
  );

  const removeBuddy = useCallback(
    async (name: string) => {
      if (!user) return;
      const updated = podBuddies.filter((b) => b !== name);
      setPodBuddies(updated);
      cache.set(user.uid, updated);
      await persistBuddies(updated);
    },
    [podBuddies, persistBuddies, user],
  );

  return { podBuddies, loading, error, addBuddy, removeBuddy };
}
