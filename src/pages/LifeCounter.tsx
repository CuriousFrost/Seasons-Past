import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsLandscapeMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type PlayerCount = 2 | 3 | 4 | 5 | 6;

interface PlayerState {
  name: string;
  life: number;
}

const DEFAULT_LIFE = 40;
const PANEL_THEMES = [
  "bg-sky-500/10 border-sky-500/25",
  "bg-rose-500/10 border-rose-500/25",
  "bg-emerald-500/10 border-emerald-500/25",
  "bg-amber-500/10 border-amber-500/25",
  "bg-violet-500/10 border-violet-500/25",
  "bg-teal-500/10 border-teal-500/25",
];
const QUICK_ADJUSTMENTS = [-10, -5, 5, 10];

function normalizePlayers(
  count: number,
  prev: PlayerState[] = [],
): PlayerState[] {
  return Array.from({ length: count }, (_, index) => ({
    name: prev[index]?.name ?? `Player ${index + 1}`,
    life: prev[index]?.life ?? DEFAULT_LIFE,
  }));
}

function normalizeCommanderDamage(
  count: number,
  prev: number[][] = [],
): number[][] {
  return Array.from({ length: count }, (_, receiver) =>
    Array.from({ length: count }, (_, source) => {
      if (receiver === source) return 0;
      const existing = prev[receiver]?.[source];
      return typeof existing === "number" ? existing : 0;
    }),
  );
}

export default function LifeCounter() {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [players, setPlayers] = useState<PlayerState[]>(() =>
    normalizePlayers(4),
  );
  const [commanderDamage, setCommanderDamage] = useState<number[][]>(() =>
    normalizeCommanderDamage(4),
  );
  const [rotated, setRotated] = useState<boolean[]>(() =>
    Array.from({ length: 4 }, () => false),
  );
  const [activeCommanderDamagePlayer, setActiveCommanderDamagePlayer] =
    useState<number | null>(null);
  const isCompactLandscape = useIsLandscapeMobile();

  useEffect(() => {
    setPlayers((prev) => normalizePlayers(playerCount, prev));
    setCommanderDamage((prev) => normalizeCommanderDamage(playerCount, prev));
    setRotated((prev) =>
      Array.from({ length: playerCount }, (_, i) => prev[i] ?? false),
    );
  }, [playerCount]);

  useEffect(() => {
    if (
      activeCommanderDamagePlayer !== null &&
      activeCommanderDamagePlayer >= playerCount
    ) {
      setActiveCommanderDamagePlayer(null);
    }
  }, [activeCommanderDamagePlayer, playerCount]);

  function toggleRotation(index: number) {
    setRotated((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  function updatePlayerName(index: number, name: string) {
    setPlayers((prev) =>
      prev.map((player, i) => (i === index ? { ...player, name } : player)),
    );
  }

  function adjustLife(index: number, delta: number) {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, life: player.life + delta } : player,
      ),
    );
  }

  function adjustCommanderDamage(
    receiverIndex: number,
    sourceIndex: number,
    delta: number,
  ) {
    setCommanderDamage((prev) => {
      const currentDamage = prev[receiverIndex]?.[sourceIndex] ?? 0;
      const newDamage = Math.max(0, currentDamage + delta);
      const actualDelta = newDamage - currentDamage;

      if (actualDelta !== 0) {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player, i) =>
            i === receiverIndex
              ? { ...player, life: player.life - actualDelta }
              : player,
          ),
        );
      }

      return prev.map((row, i) =>
        i === receiverIndex
          ? row.map((value, j) => (j === sourceIndex ? newDamage : value))
          : row,
      );
    });
  }

  function resetGame() {
    setPlayers((prev) =>
      prev.map((player) => ({ ...player, life: DEFAULT_LIFE })),
    );
    setCommanderDamage(() => normalizeCommanderDamage(playerCount));
  }

  function isEliminated(playerIndex: number): boolean {
    if (players[playerIndex].life <= 0) return true;
    const damages = commanderDamage[playerIndex];
    if (!damages) return false;
    for (let i = 0; i < damages.length; i++) {
      if (i !== playerIndex && damages[i] >= 21) return true;
    }
    return false;
  }

  function renderCommanderDamageRows(receiverIndex: number) {
    return players.map((opponent, opponentIndex) => {
      if (opponentIndex === receiverIndex) return null;
      const damage = commanderDamage[receiverIndex]?.[opponentIndex] ?? 0;
      const isLethal = damage >= 21;

      return (
        <div
          key={opponentIndex}
          className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">From {opponent.name}</p>
            <p
              className={cn(
                "text-xs",
                isLethal ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {isLethal ? "Lethal damage (21+)" : "Damage received"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              className="h-9 w-9 text-lg"
              onClick={() => adjustCommanderDamage(receiverIndex, opponentIndex, -1)}
            >
              -
            </Button>
            <span
              className={cn(
                "w-8 text-center text-lg font-semibold",
                isLethal && "text-destructive",
              )}
            >
              {damage}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-9 w-9 text-lg"
              onClick={() => adjustCommanderDamage(receiverIndex, opponentIndex, 1)}
            >
              +
            </Button>
          </div>
        </div>
      );
    });
  }

  const gridClassName = cn(
    "grid gap-4 sm:grid-cols-2",
    playerCount === 6 && "lg:grid-cols-3",
    playerCount === 5 && "lg:grid-cols-[1fr_1fr_0.85fr]",
  );

  const compactGridClassName = cn(
    "grid h-full min-h-0 auto-rows-fr gap-2",
    playerCount === 2 && "grid-cols-2 grid-rows-1",
    playerCount === 3 && "grid-cols-3 grid-rows-1",
    playerCount === 4 && "grid-cols-2 grid-rows-2",
    (playerCount === 5 || playerCount === 6) && "grid-cols-3 grid-rows-2",
  );

  return (
    <div className={cn("space-y-4", isCompactLandscape && "space-y-2")}>
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          isCompactLandscape && "gap-2",
        )}
      >
        <div>
          <h1 className={cn("text-3xl font-bold", isCompactLandscape && "text-2xl")}>
            Life Counter
          </h1>
          {!isCompactLandscape && (
            <p className="text-muted-foreground mt-1">
              Track life totals and commander damage.
            </p>
          )}
        </div>

        <div className={cn("flex flex-wrap items-end gap-3", isCompactLandscape && "gap-2")}>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">Players</p>
            <Select
              value={String(playerCount)}
              onValueChange={(value) => setPlayerCount(Number(value) as PlayerCount)}
            >
              <SelectTrigger className={cn("w-28", isCompactLandscape && "h-8 w-24")}>
                <SelectValue placeholder="Players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Players</SelectItem>
                <SelectItem value="3">3 Players</SelectItem>
                <SelectItem value="4">4 Players</SelectItem>
                <SelectItem value="5">5 Players</SelectItem>
                <SelectItem value="6">6 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={resetGame}
            className={cn(isCompactLandscape && "h-8 px-3 text-xs")}
          >
            Reset Game
          </Button>
        </div>
      </div>

      {/* 12rem accounts for: header (3.5rem) + controls (~4.5rem) + page padding + spacing */}
      {isCompactLandscape ? (
        <div className="h-[calc(100svh-12rem)] min-h-[220px]">
          <div className={compactGridClassName}>
            {players.map((player, index) => {
              const eliminated = isEliminated(index);
              const panelColor = PANEL_THEMES[index % PANEL_THEMES.length];

              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex min-h-0 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-center",
                    panelColor,
                    eliminated && "grayscale opacity-60",
                  )}
                >
                  {eliminated && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/20">
                      <span className="text-destructive text-lg font-black tracking-wider">
                        OUT
                      </span>
                    </div>
                  )}

                  <Input
                    value={player.name}
                    onChange={(event) => updatePlayerName(index, event.target.value)}
                    className="h-8 text-center text-sm font-semibold"
                  />

                  <div className="text-4xl font-bold leading-none">{player.life}</div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      className="h-8 min-w-0 px-2 text-xs"
                      onClick={() => adjustLife(index, -5)}
                    >
                      -5
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-8 min-w-0 px-2 text-sm"
                      onClick={() => adjustLife(index, -1)}
                    >
                      -1
                    </Button>
                    <Button
                      className="h-8 min-w-0 px-2 text-sm"
                      onClick={() => adjustLife(index, 1)}
                    >
                      +1
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 min-w-0 px-2 text-xs"
                      onClick={() => adjustLife(index, 5)}
                    >
                      +5
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setActiveCommanderDamagePlayer(index)}
                  >
                    DMG
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={gridClassName}>
          {players.map((player, index) => {
            const eliminated = isEliminated(index);
            const panelColor = PANEL_THEMES[index % PANEL_THEMES.length];
            const panelLayout = cn(
              playerCount === 3 &&
                index === 2 &&
                "sm:col-span-2 sm:justify-self-center sm:w-full sm:max-w-[520px]",
              playerCount === 5 && index === 0 && "lg:col-start-1 lg:row-start-1",
              playerCount === 5 && index === 1 && "lg:col-start-2 lg:row-start-1",
              playerCount === 5 && index === 2 && "lg:col-start-1 lg:row-start-2",
              playerCount === 5 && index === 3 && "lg:col-start-2 lg:row-start-2",
              playerCount === 5 &&
                index === 4 &&
                "lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:self-stretch",
            );

            return (
              <div
                key={index}
                className={cn(
                  "relative rounded-xl border p-4 shadow-sm transition-transform duration-300 sm:p-6",
                  panelColor,
                  panelLayout,
                  eliminated && "grayscale opacity-60",
                  rotated[index] && "rotate-180",
                )}
              >
                {eliminated && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20">
                    <span className="text-destructive text-2xl font-black tracking-wider sm:text-3xl">
                      ELIMINATED
                    </span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-20 h-8 w-8 opacity-50 hover:opacity-100"
                  onClick={() => toggleRotation(index)}
                >
                  <RotateCw className="h-4 w-4" />
                  <span className="sr-only">Rotate card</span>
                </Button>
                <div className="flex flex-col gap-4">
                  <Input
                    value={player.name}
                    onChange={(event) => updatePlayerName(index, event.target.value)}
                    className="h-11 text-base font-semibold"
                  />

                  <div className="flex flex-col items-center gap-4">
                    <div className="text-5xl font-bold sm:text-6xl">{player.life}</div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="h-12 w-14 text-xl"
                        onClick={() => adjustLife(index, -1)}
                      >
                        -1
                      </Button>
                      <Button
                        size="lg"
                        className="h-12 w-14 text-xl"
                        onClick={() => adjustLife(index, 1)}
                      >
                        +1
                      </Button>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                      {QUICK_ADJUSTMENTS.map((delta) => (
                        <Button
                          key={delta}
                          variant="outline"
                          size="lg"
                          className="h-11 text-base"
                          onClick={() => adjustLife(index, delta)}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Commander Damage</p>
                    <div className="space-y-2">{renderCommanderDamageRows(index)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={activeCommanderDamagePlayer !== null}
        onOpenChange={(open) => !open && setActiveCommanderDamagePlayer(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Commander Damage</DialogTitle>
            <DialogDescription>
              {`Adjust damage dealt to ${players[activeCommanderDamagePlayer!]?.name ?? "player"}.`}
            </DialogDescription>
          </DialogHeader>
          {activeCommanderDamagePlayer !== null && (
            <div className="space-y-2">
              {renderCommanderDamageRows(activeCommanderDamagePlayer)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
