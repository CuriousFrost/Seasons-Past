import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useFriends } from "@/hooks/use-friends";
import { AddGameForm } from "@/components/games/AddGameForm";
import type { Game } from "@/types";

export default function AddGame() {
  const { decks, loading: decksLoading, error: decksError } = useDecks();
  const { loading: gamesLoading, error: gamesError, addGame } = useGames();
  const { podBuddies, loading: buddiesLoading } = usePodBuddies();
  const { profile } = useUserProfile();
  const { friends } = useFriends(
    profile?.friendId ?? null,
    profile?.username ?? "",
  );
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const loading = decksLoading || gamesLoading || buddiesLoading;
  const error = decksError || gamesError;
  const activeDecks = decks.filter((d) => !d.archived);

  const onlineFriendNames = useMemo(
    () => friends.map((f) => f.username),
    [friends],
  );

  async function handleSubmit(game: Omit<Game, "id">) {
    setSubmitting(true);
    try {
      await addGame(game);
      navigate("/games");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Game</h1>
        <p className="text-muted-foreground mt-1">Record a new EDH game.</p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : activeDecks.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No active decks found.</p>
          <p className="mt-1">
            <Link to="/commanders" className="text-primary underline">
              Add a deck
            </Link>{" "}
            before logging a game.
          </p>
        </div>
      ) : (
        <AddGameForm
          decks={activeDecks}
          podBuddies={podBuddies}
          onlineFriends={onlineFriendNames}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
