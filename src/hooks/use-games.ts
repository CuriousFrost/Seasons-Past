import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";
import type { Game } from "@/types";

const cache = createCache<Game[]>();

export function useGames() {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [games, setGames] = useState<Game[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Persist the full games array back to Firestore
  const persistGames = useCallback(
    async (updated: Game[]) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { games: updated },
          { merge: true },
        );
      } catch (err) {
        setError("Failed to save games. Please try again.");
        console.error("persistGames error:", err);
      }
    },
    [user],
  );

  // Load games on mount
  useEffect(() => {
    if (!user) {
      setGames([]);
      setError(null);
      setLoading(false);
      return;
    }
    const userUid = user.uid;

    if (cache.get(userUid)) {
      setGames(cache.get(userUid)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadGames() {
      try {
        const snap = await getDoc(doc(db, "users", userUid));
        if (!cancelled) {
          const data = snap.data();
          const loaded = data?.games ?? [];
          setGames(loaded);
          cache.set(userUid, loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load games.");
          console.error("loadGames error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGames();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addGame = useCallback(
    async (game: Omit<Game, "id">) => {
      if (!user) return;
      const nextId =
        games.length > 0 ? Math.max(...games.map((g) => g.id)) + 1 : 1;

      const newGame: Game = { id: nextId, ...game };
      const updated = [...games, newGame];
      setGames(updated);
      cache.set(user.uid, updated);
      await persistGames(updated);
    },
    [games, persistGames, user],
  );

  const editGame = useCallback(
    async (game: Game) => {
      if (!user) return;
      const updated = games.map((g) => (g.id === game.id ? game : g));
      setGames(updated);
      cache.set(user.uid, updated);
      await persistGames(updated);
    },
    [games, persistGames, user],
  );

  const deleteGame = useCallback(
    async (gameId: number) => {
      if (!user) return;
      const updated = games.filter((g) => g.id !== gameId);
      setGames(updated);
      cache.set(user.uid, updated);
      await persistGames(updated);
    },
    [games, persistGames, user],
  );

  return { games, loading, error, addGame, editGame, deleteGame };
}
