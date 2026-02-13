import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Game } from "@/types";

export function useGames() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadGames() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (!cancelled) {
          const data = snap.data();
          setGames(data?.games ?? []);
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
      const nextId =
        games.length > 0 ? Math.max(...games.map((g) => g.id)) + 1 : 1;

      const newGame: Game = { id: nextId, ...game };
      const updated = [...games, newGame];
      setGames(updated);
      await persistGames(updated);
    },
    [games, persistGames],
  );

  const editGame = useCallback(
    async (game: Game) => {
      const updated = games.map((g) => (g.id === game.id ? game : g));
      setGames(updated);
      await persistGames(updated);
    },
    [games, persistGames],
  );

  const deleteGame = useCallback(
    async (gameId: number) => {
      const updated = games.filter((g) => g.id !== gameId);
      setGames(updated);
      await persistGames(updated);
    },
    [games, persistGames],
  );

  return { games, loading, error, addGame, editGame, deleteGame };
}
