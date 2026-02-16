import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";
import type { Commander, Deck, Decklist } from "@/types";

const cache = createCache<Deck[]>();

export function useDecks() {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [decks, setDecks] = useState<Deck[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Persist the full decks array back to Firestore
  const persistDecks = useCallback(
    async (updated: Deck[]) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { decks: updated },
          { merge: true },
        );
      } catch (err) {
        setError("Failed to save decks. Please try again.");
        console.error("persistDecks error:", err);
      }
    },
    [user],
  );

  // Load decks on mount
  useEffect(() => {
    if (!user) {
      setDecks([]);
      setError(null);
      setLoading(false);
      return;
    }
    const userUid = user.uid;

    if (cache.get(userUid)) {
      setDecks(cache.get(userUid)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadDecks() {
      try {
        const snap = await getDoc(doc(db, "users", userUid));
        if (!cancelled) {
          const data = snap.data();
          const loaded: Deck[] = data?.decks ?? [];
          loaded.sort((a, b) => {
            const oa = a.sortOrder ?? Infinity;
            const ob = b.sortOrder ?? Infinity;
            return oa - ob;
          });
          setDecks(loaded);
          cache.set(userUid, loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load decks.");
          console.error("loadDecks error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDecks();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addDeck = useCallback(
    async (name: string, commander: Commander) => {
      if (!user) return;
      const nextId =
        decks.length > 0 ? Math.max(...decks.map((d) => d.id)) + 1 : 1;

      const newDeck: Deck = {
        id: nextId,
        name,
        commander,
        dateAdded: new Date().toISOString().split("T")[0],
      };

      const updated = [...decks, newDeck];
      setDecks(updated);
      cache.set(user.uid, updated);
      await persistDecks(updated);
    },
    [decks, persistDecks, user],
  );

  const toggleArchive = useCallback(
    async (deckId: number) => {
      if (!user) return;
      const updated = decks.map((d) =>
        d.id === deckId ? { ...d, archived: !d.archived } : d,
      );
      setDecks(updated);
      cache.set(user.uid, updated);
      await persistDecks(updated);
    },
    [decks, persistDecks, user],
  );

  const deleteDeck = useCallback(
    async (deckId: number) => {
      if (!user) return;
      const updated = decks.filter((d) => d.id !== deckId);
      setDecks(updated);
      cache.set(user.uid, updated);
      await persistDecks(updated);
    },
    [decks, persistDecks, user],
  );

  const updateDecklist = useCallback(
    async (deckId: number, decklist: Decklist) => {
      if (!user) return;
      const updated = decks.map((d) =>
        d.id === deckId ? { ...d, decklist } : d,
      );
      setDecks(updated);
      cache.set(user.uid, updated);
      await persistDecks(updated);
    },
    [decks, persistDecks, user],
  );

  const updateDeckOrder = useCallback(
    async (orderedDecks: Deck[]) => {
      if (!user) return;
      const updated = orderedDecks.map((d, i) => ({ ...d, sortOrder: i }));
      setDecks(updated);
      cache.set(user.uid, updated);
      await persistDecks(updated);
    },
    [persistDecks, user],
  );

  return { decks, loading, error, addDeck, toggleArchive, deleteDeck, updateDecklist, updateDeckOrder };
}
