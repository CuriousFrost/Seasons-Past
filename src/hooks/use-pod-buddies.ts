import { useCallback, useEffect, useRef, useState } from "react";
import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";
import type { SavedCommander } from "@/types";

type BuddyCommanders = Record<string, SavedCommander[]>;
type BuddyData = { buddies: string[]; commanders: BuddyCommanders };

const cache = createCache<BuddyData>();
const EMPTY: BuddyData = { buddies: [], commanders: {} };

export function usePodBuddies() {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [data, setData] = useState<BuddyData>(cached ?? EMPTY);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Mirror of `data` so back-to-back writes (e.g. auto-saving two seats'
  // commanders in a row) build on each other instead of a stale render.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!user) return;

    return cache.subscribe((cachedUid, value) => {
      if (cachedUid !== user.uid || !value) return;
      setData(value);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setData(EMPTY);
      setError(null);
      setLoading(false);
      return;
    }
    const userUid = user.uid;

    if (cache.get(userUid)) {
      setData(cache.get(userUid)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadBuddies() {
      try {
        const snap = await getDoc(doc(db, "users", userUid));
        if (!cancelled) {
          const docData = snap.data();
          const loaded: BuddyData = {
            buddies: docData?.podBuddies ?? [],
            commanders: docData?.podBuddyCommanders ?? {},
          };
          setData(loaded);
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

  /** Optimistically apply `next`, persist `patch`, roll back on failure. */
  const commit = useCallback(
    async (next: BuddyData, patch: Record<string, unknown>) => {
      if (!user) return;
      const previous = dataRef.current;
      dataRef.current = next;
      setData(next);
      cache.set(user.uid, next);
      try {
        await setDoc(doc(db, "users", user.uid), patch, { merge: true });
      } catch (err) {
        dataRef.current = previous;
        setData(previous);
        cache.set(user.uid, previous);
        toast.error("Couldn't save — check your connection and try again.");
        console.error("persistBuddies error:", err);
        throw err;
      }
    },
    [user],
  );

  const addBuddy = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = dataRef.current;

      // Case-insensitive duplicate check
      const lower = trimmed.toLowerCase();
      if (current.buddies.some((b) => b.toLowerCase() === lower)) return;

      const buddies = [...current.buddies, trimmed];
      await commit({ ...current, buddies }, { podBuddies: buddies });
    },
    [commit],
  );

  const removeBuddy = useCallback(
    async (name: string) => {
      const current = dataRef.current;
      const buddies = current.buddies.filter((b) => b !== name);
      const commanders = { ...current.commanders };
      delete commanders[name];
      await commit(
        { buddies, commanders },
        { podBuddies: buddies, podBuddyCommanders: { [name]: deleteField() } },
      );
    },
    [commit],
  );

  /** Save a commander to a buddy's list; re-adding one moves it to the front. */
  const addBuddyCommander = useCallback(
    async (buddy: string, commander: SavedCommander) => {
      const current = dataRef.current;
      if (!current.buddies.includes(buddy)) return;
      const existing = current.commanders[buddy] ?? [];
      const lower = commander.name.toLowerCase();
      if (existing[0]?.name.toLowerCase() === lower) return;
      const list = [
        commander,
        ...existing.filter((c) => c.name.toLowerCase() !== lower),
      ];
      await commit(
        { ...current, commanders: { ...current.commanders, [buddy]: list } },
        { podBuddyCommanders: { [buddy]: list } },
      );
    },
    [commit],
  );

  const removeBuddyCommander = useCallback(
    async (buddy: string, commanderName: string) => {
      const current = dataRef.current;
      const list = (current.commanders[buddy] ?? []).filter(
        (c) => c.name !== commanderName,
      );
      await commit(
        { ...current, commanders: { ...current.commanders, [buddy]: list } },
        { podBuddyCommanders: { [buddy]: list } },
      );
    },
    [commit],
  );

  return {
    podBuddies: data.buddies,
    podBuddyCommanders: data.commanders,
    loading,
    error,
    addBuddy,
    removeBuddy,
    addBuddyCommander,
    removeBuddyCommander,
  };
}
