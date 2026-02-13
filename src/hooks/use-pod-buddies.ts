import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function usePodBuddies() {
  const { user } = useAuth();
  const [podBuddies, setPodBuddies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBuddies() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (!cancelled) {
          const data = snap.data();
          setPodBuddies(data?.podBuddies ?? []);
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
      const trimmed = name.trim();
      if (!trimmed) return;

      // Case-insensitive duplicate check
      const lower = trimmed.toLowerCase();
      if (podBuddies.some((b) => b.toLowerCase() === lower)) return;

      const updated = [...podBuddies, trimmed];
      setPodBuddies(updated);
      await persistBuddies(updated);
    },
    [podBuddies, persistBuddies],
  );

  const removeBuddy = useCallback(
    async (name: string) => {
      const updated = podBuddies.filter((b) => b !== name);
      setPodBuddies(updated);
      await persistBuddies(updated);
    },
    [podBuddies, persistBuddies],
  );

  return { podBuddies, loading, error, addBuddy, removeBuddy };
}
