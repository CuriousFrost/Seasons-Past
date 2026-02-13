import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { GameHistory } from "@/components/games/GameHistory";

export default function GameLog() {
  const { decks, loading: decksLoading, error: decksError } = useDecks();
  const {
    games,
    loading: gamesLoading,
    error: gamesError,
    editGame,
    deleteGame,
  } = useGames();

  const loading = decksLoading || gamesLoading;
  const error = decksError || gamesError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Game Log</h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter your recorded games.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-[160px] rounded-md" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-md" />
        </div>
      ) : games.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No games logged yet.</p>
          <p className="mt-1">
            <Link to="/games/new" className="text-primary underline">
              Log your first game
            </Link>{" "}
            to see your history.
          </p>
        </div>
      ) : (
        <GameHistory
          games={games}
          decks={decks}
          onEditGame={editGame}
          onDeleteGame={deleteGame}
        />
      )}
    </div>
  );
}
