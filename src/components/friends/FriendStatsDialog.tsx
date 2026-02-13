import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import type { FriendPublicData } from "@/types";

interface FriendStatsDialogProps {
  friendId: string | null;
  onClose: () => void;
  onFetch: (friendId: string) => Promise<FriendPublicData>;
}

export function FriendStatsDialog({
  friendId,
  onClose,
  onFetch,
}: FriendStatsDialogProps) {
  const [data, setData] = useState<FriendPublicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!friendId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    onFetch(friendId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load friend data",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [friendId, onFetch]);

  const totalGames = data?.games.length ?? 0;
  const wins = data?.games.filter((g) => g.won).length ?? 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const activeDecks = data?.decks.filter((d) => !d.archived).length ?? 0;

  return (
    <Dialog
      open={!!friendId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {loading
              ? "Loading..."
              : data
                ? `${data.username}'s Stats`
                : "Friend Stats"}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-32 rounded-md" />
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {data && !loading && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label="Games" value={totalGames} />
              <StatBox label="Wins" value={wins} />
              <StatBox label="Win Rate" value={`${winRate}%`} />
              <StatBox label="Active Decks" value={activeDecks} />
            </div>

            {/* Decks */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Decks</h3>
              {data.decks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No decks.</p>
              ) : (
                <ul className="space-y-1">
                  {data.decks
                    .filter((d) => !d.archived)
                    .map((deck) => (
                      <li
                        key={deck.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <ManaSymbols
                          colorIdentity={deck.commander.colorIdentity}
                          size="sm"
                        />
                        <span>
                          {deck.name} — {deck.commander.name}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Recent Games */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recent Games</h3>
              {data.games.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No games logged.
                </p>
              ) : (
                <ul className="space-y-1">
                  {data.games
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 10)
                    .map((game) => (
                      <li
                        key={game.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {game.date}
                        </span>
                        <span>{game.myDeck.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            game.won
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }
                        >
                          {game.won ? "Win" : "Loss"}
                        </Badge>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-muted/50 rounded-md p-3 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
