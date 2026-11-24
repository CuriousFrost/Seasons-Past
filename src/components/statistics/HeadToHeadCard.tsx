import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import type { HeadToHeadPlayer } from "@/lib/stats";

interface HeadToHeadCardProps {
  data: HeadToHeadPlayer[];
}

const MIN_TOUGHEST_GAMES = 3;

function pluralGames(n: number) {
  return `${n} ${n === 1 ? "game" : "games"}`;
}

function MatchRecord({
  myWins,
  theirWins,
  playerName,
}: {
  myWins: number;
  theirWins: number;
  playerName: string;
}) {
  return (
    <>
      You{" "}
      <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
        {myWins}
      </span>{" "}
      –{" "}
      <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
        {theirWins}
      </span>{" "}
      {playerName}
    </>
  );
}

export function HeadToHeadCard({ data }: HeadToHeadCardProps) {
  // Lowest user win rate among (player, commander) pairs with enough games.
  // Ties: more games first (a bigger sample is the more convincing rival).
  const toughest = useMemo(() => {
    let best: {
      playerName: string;
      commander: HeadToHeadPlayer["commanders"][number];
      winRate: number;
    } | null = null;
    for (const p of data) {
      for (const c of p.commanders) {
        if (c.games < MIN_TOUGHEST_GAMES) continue;
        const winRate = c.myWins / c.games;
        if (
          !best ||
          winRate < best.winRate ||
          (winRate === best.winRate && c.games > best.commander.games)
        ) {
          best = { playerName: p.playerName, commander: c, winRate };
        }
      }
    }
    return best;
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Head-to-Head</CardTitle>
          <CardDescription>
            How you fare against each pod buddy's commanders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground text-sm">
              Log games with named opponents and their commanders to see
              head-to-head records.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-Head</CardTitle>
        <CardDescription>
          How you fare against each pod buddy's commanders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {toughest && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Toughest matchup: </span>
            <span className="font-medium break-words">
              {toughest.playerName}'s {toughest.commander.commander}
            </span>
            <span className="text-muted-foreground">
              {" "}
              — you've won {toughest.commander.myWins} of{" "}
              {pluralGames(toughest.commander.games)} (
              {Math.round(toughest.winRate * 100)}%)
            </span>
          </div>
        )}

        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {data.map((player) => (
            <div key={player.playerName} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold break-words">
                  {player.playerName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {pluralGames(player.games)} ·{" "}
                  <MatchRecord
                    myWins={player.myWins}
                    theirWins={player.theirWins}
                    playerName={player.playerName}
                  />
                </p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {player.commanders.map((c) => (
                  <li
                    key={c.commander}
                    className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 text-sm"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                      <span className="break-words">{c.commander}</span>
                      {c.colorIdentity.length > 0 && (
                        <ManaSymbols colorIdentity={c.colorIdentity} size="sm" />
                      )}
                    </div>
                    <p className="text-muted-foreground shrink-0 text-right text-xs leading-5">
                      {pluralGames(c.games)} ·{" "}
                      <MatchRecord
                        myWins={c.myWins}
                        theirWins={c.theirWins}
                        playerName={player.playerName}
                      />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
