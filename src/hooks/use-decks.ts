import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Commander, Deck, Decklist } from "@/types";

export function useDecks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDecks() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (!cancelled) {
          const data = snap.data();
          const loaded: Deck[] = data?.decks ?? [];
          loaded.sort((a, b) => {
            const oa = a.sortOrder ?? Infinity;
            const ob = b.sortOrder ?? Infinity;
            return oa - ob;
          });
          setDecks(loaded);
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
      await persistDecks(updated);
    },
    [decks, persistDecks],
  );

  const toggleArchive = useCallback(
    async (deckId: number) => {
      const updated = decks.map((d) =>
        d.id === deckId ? { ...d, archived: !d.archived } : d,
      );
      setDecks(updated);
      await persistDecks(updated);
    },
    [decks, persistDecks],
  );

  const deleteDeck = useCallback(
    async (deckId: number) => {
      const updated = decks.filter((d) => d.id !== deckId);
      setDecks(updated);
      await persistDecks(updated);
    },
    [decks, persistDecks],
  );

  const updateDecklist = useCallback(
    async (deckId: number, decklist: Decklist) => {
      const updated = decks.map((d) =>
        d.id === deckId ? { ...d, decklist } : d,
      );
      setDecks(updated);
      await persistDecks(updated);
    },
    [decks, persistDecks],
  );

  const updateDeckOrder = useCallback(
    async (orderedDecks: Deck[]) => {
      const updated = orderedDecks.map((d, i) => ({ ...d, sortOrder: i }));
      setDecks(updated);
      await persistDecks(updated);
    },
    [persistDecks],
  );

  return { decks, loading, error, addDeck, toggleArchive, deleteDeck, updateDecklist, updateDeckOrder };
}
