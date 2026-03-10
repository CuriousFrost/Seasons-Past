import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCw, Swords, Skull } from "lucide-react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsSmallDevice, useIsLandscapeMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type PlayerCount = 2 | 3 | 4 | 5 | 6;

interface PlayerState {
  name: string;
  life: number;
  poison: number;
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

type GridPlacement = {
  colStart: number;
  rowStart: number;
  rowSpan?: number;
  rotation: "0" | "180" | "side";
};
type GridConfig = { cols: number; rows: number; players: GridPlacement[] };

const GRID_CONFIGS: Record<PlayerCount, GridConfig> = {
  2: {
    cols: 1,
    rows: 2,
    players: [
      { colStart: 1, rowStart: 2, rotation: "0" },
      { colStart: 1, rowStart: 1, rotation: "180" },
    ],
  },
  3: {
    cols: 2,
    rows: 2,
    players: [
      { colStart: 2, rowStart: 2, rotation: "0" },
      { colStart: 2, rowStart: 1, rotation: "180" },
      { colStart: 1, rowStart: 1, rowSpan: 2, rotation: "side" },
    ],
  },
  4: {
    cols: 2,
    rows: 2,
    players: [
      { colStart: 1, rowStart: 2, rotation: "0" },
      { colStart: 2, rowStart: 2, rotation: "0" },
      { colStart: 1, rowStart: 1, rotation: "180" },
      { colStart: 2, rowStart: 1, rotation: "180" },
    ],
  },
  5: {
    cols: 3,
    rows: 2,
    players: [
      { colStart: 2, rowStart: 2, rotation: "0" },
      { colStart: 3, rowStart: 2, rotation: "0" },
      { colStart: 2, rowStart: 1, rotation: "180" },
      { colStart: 3, rowStart: 1, rotation: "180" },
      { colStart: 1, rowStart: 1, rowSpan: 2, rotation: "side" },
    ],
  },
  6: {
    cols: 3,
    rows: 2,
    players: [
      { colStart: 1, rowStart: 2, rotation: "0" },
      { colStart: 2, rowStart: 2, rotation: "0" },
      { colStart: 3, rowStart: 2, rotation: "0" },
      { colStart: 1, rowStart: 1, rotation: "180" },
      { colStart: 2, rowStart: 1, rotation: "180" },
      { colStart: 3, rowStart: 1, rotation: "180" },
    ],
  },
};

function normalizePlayers(count: number, prev: PlayerState[] = []): PlayerState[] {
  return Array.from({ length: count }, (_, index) => ({
    name: prev[index]?.name ?? `Player ${index + 1}`,
    life: prev[index]?.life ?? DEFAULT_LIFE,
    poison: prev[index]?.poison ?? 0,
  }));
}

function normalizeCommanderDamage(count: number, prev: number[][] = []): number[][] {
  return Array.from({ length: count }, (_, receiver) =>
    Array.from({ length: count }, (_, source) => {
      if (receiver === source) return 0;
      const existing = prev[receiver]?.[source];
      return typeof existing === "number" ? existing : 0;
    }),
  );
}

function SideCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ gridRow: "span 2", ...style }}>
      {dims.w > 0 && (
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: dims.h,
            height: dims.w,
            transform: "translate(-50%, -50%) rotate(-90deg)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MobilePlayerCard({
  player,
  index,
  eliminated,
  onAdjustLife,
  onOpenCD,
  onOpenPoison,
  rotation,
}: {
  player: PlayerState;
  index: number;
  eliminated: boolean;
  onAdjustLife: (delta: number) => void;
  onOpenCD: () => void;
  onOpenPoison: () => void;
  rotation: "0" | "180" | "side";
}) {
  const panelColor = PANEL_THEMES[index % PANEL_THEMES.length];

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none flex-col items-center rounded-lg border p-1",
        panelColor,
        eliminated && "opacity-60 grayscale",
        rotation === "180" && "rotate-180",
      )}
    >
      {eliminated && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/20">
          <span className="text-destructive text-sm font-black tracking-wider">OUT</span>
        </div>
      )}

      <p className="w-full truncate text-center text-xs font-semibold">{player.name}</p>

      <div className="flex min-h-0 w-full flex-1 items-stretch">
        <Button
          variant="ghost"
          className="flex-1 text-2xl font-bold md:text-3xl"
          onClick={() => onAdjustLife(-1)}
        >
          −
        </Button>
        <div className="flex items-center justify-center px-1">
          <span className="text-5xl font-bold tabular-nums md:text-7xl">{player.life}</span>
        </div>
        <Button
          variant="ghost"
          className="flex-1 text-2xl font-bold md:text-3xl"
          onClick={() => onAdjustLife(1)}
        >
          +
        </Button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onOpenCD}>
          <Swords className="h-6 w-6" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onOpenPoison}>
            <Skull className="h-6 w-6" />
          </Button>
          {player.poison > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
              {player.poison}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LifeCounter() {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [players, setPlayers] = useState<PlayerState[]>(() => normalizePlayers(4));
  const [commanderDamage, setCommanderDamage] = useState<number[][]>(() =>
    normalizeCommanderDamage(4),
  );
  const [rotated, setRotated] = useState<boolean[]>(() =>
    Array.from({ length: 4 }, () => false),
  );
  const [activeCDPlayer, setActiveCDPlayer] = useState<number | null>(null);
  const [activePoisonPlayer, setActivePoisonPlayer] = useState<number | null>(null);

  const isSmallDevice = useIsSmallDevice();
  const isLandscape = useIsLandscapeMobile();

  // Lock to landscape on mobile (best-effort — not supported in all browsers)
  useEffect(() => {
    if (!isSmallDevice) return;
    try {
      (screen.orientation as unknown as { lock: (o: string) => Promise<void> })
        .lock("landscape")
        .catch(() => {});
    } catch {}
    return () => {
      try {
        (screen.orientation as unknown as { unlock: () => void }).unlock();
      } catch {}
    };
  }, [isSmallDevice]);

  useEffect(() => {
    setPlayers((prev) => normalizePlayers(playerCount, prev));
    setCommanderDamage((prev) => normalizeCommanderDamage(playerCount, prev));
    setRotated((prev) => Array.from({ length: playerCount }, (_, i) => prev[i] ?? false));
  }, [playerCount]);

  useEffect(() => {
    if (activeCDPlayer !== null && activeCDPlayer >= playerCount) {
      setActiveCDPlayer(null);
    }
  }, [activeCDPlayer, playerCount]);

  useEffect(() => {
    if (activePoisonPlayer !== null && activePoisonPlayer >= playerCount) {
      setActivePoisonPlayer(null);
    }
  }, [activePoisonPlayer, playerCount]);

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

  function adjustPoison(index: number, delta: number) {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, poison: Math.max(0, player.poison + delta) } : player,
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
      prev.map((player) => ({ ...player, life: DEFAULT_LIFE, poison: 0 })),
    );
    setCommanderDamage(() => normalizeCommanderDamage(playerCount));
  }

  function isEliminated(playerIndex: number): boolean {
    if (players[playerIndex].life <= 0) return true;
    if (players[playerIndex].poison >= 10) return true;
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

  // Mobile game board — always mounted so state survives rotation
  if (isSmallDevice) {
    const config = GRID_CONFIGS[playerCount];
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        {/* Portrait overlay — rendered on top; game board stays mounted below */}
        {!isLandscape && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background p-6 text-center">
            <div className="flex items-center">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="text-5xl">↺</div>
              <p className="text-xl font-semibold">Rotate your device</p>
              <p className="text-sm text-muted-foreground">
                Life counter works in landscape only.
              </p>
            </div>
          </div>
        )}
        {/* Compact top bar */}
        <div className="flex shrink-0 items-center gap-2 border-b px-2 py-1">
          <SidebarTrigger className="h-8 w-8" />
          <Select
            value={String(playerCount)}
            onValueChange={(value) => setPlayerCount(Number(value) as PlayerCount)}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Players</SelectItem>
              <SelectItem value="3">3 Players</SelectItem>
              <SelectItem value="4">4 Players</SelectItem>
              <SelectItem value="5">5 Players</SelectItem>
              <SelectItem value="6">6 Players</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={resetGame}>
            Reset
          </Button>
        </div>

        {/* Player grid */}
        <div
          className="grid min-h-0 flex-1 gap-1 p-1"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
            gridTemplateRows: `repeat(${config.rows}, 1fr)`,
          }}
        >
          {players.slice(0, config.players.length).map((player, index) => {
            const p = config.players[index];
            const eliminated = isEliminated(index);
            const card = (
              <MobilePlayerCard
                player={player}
                index={index}
                eliminated={eliminated}
                onAdjustLife={(delta) => adjustLife(index, delta)}
                onOpenCD={() => setActiveCDPlayer(index)}
                onOpenPoison={() => setActivePoisonPlayer(index)}
                rotation={p.rotation}
              />
            );

            if (p.rotation === "side") {
              return (
                <SideCard key={index} style={{ gridColumnStart: p.colStart }}>
                  {card}
                </SideCard>
              );
            }

            return (
              <div
                key={index}
                style={{ gridColumnStart: p.colStart, gridRowStart: p.rowStart }}
              >
                {card}
              </div>
            );
          })}
        </div>

        {/* Commander damage dialog */}
        <Dialog
          open={activeCDPlayer !== null}
          onOpenChange={(open) => !open && setActiveCDPlayer(null)}
        >
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Commander Damage</DialogTitle>
              <DialogDescription>
                {`Adjust damage dealt to ${players[activeCDPlayer!]?.name ?? "player"}.`}
              </DialogDescription>
            </DialogHeader>
            {activeCDPlayer !== null && (
              <div className="space-y-2">{renderCommanderDamageRows(activeCDPlayer)}</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Poison counters dialog */}
        <Dialog
          open={activePoisonPlayer !== null}
          onOpenChange={(open) => !open && setActivePoisonPlayer(null)}
        >
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Poison Counters</DialogTitle>
              <DialogDescription>
                {`${players[activePoisonPlayer!]?.name ?? "Player"} — eliminated at 10`}
              </DialogDescription>
            </DialogHeader>
            {activePoisonPlayer !== null && (
              <div className="flex flex-col items-center gap-4 py-2">
                <span
                  className={cn(
                    "text-5xl font-bold tabular-nums",
                    players[activePoisonPlayer].poison >= 10 && "text-destructive",
                  )}
                >
                  {players[activePoisonPlayer].poison}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-xl"
                    onClick={() => adjustPoison(activePoisonPlayer, -1)}
                  >
                    −
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-xl"
                    onClick={() => adjustPoison(activePoisonPlayer, 1)}
                  >
                    +
                  </Button>
                </div>
                {players[activePoisonPlayer].poison >= 10 && (
                  <p className="text-sm font-semibold text-destructive">
                    Eliminated by poison!
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop branch (unchanged)
  const gridClassName = cn(
    "grid gap-4 sm:grid-cols-2",
    playerCount === 6 && "lg:grid-cols-3",
    playerCount === 5 && "lg:grid-cols-[1fr_1fr_0.85fr]",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Life Counter</h1>
          <p className="mt-1 text-muted-foreground">
            Track life totals and commander damage.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Players</p>
            <Select
              value={String(playerCount)}
              onValueChange={(value) => setPlayerCount(Number(value) as PlayerCount)}
            >
              <SelectTrigger className="w-28">
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

          <Button variant="outline" onClick={resetGame}>
            Reset Game
          </Button>
        </div>
      </div>

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

      <Dialog
        open={activeCDPlayer !== null}
        onOpenChange={(open) => !open && setActiveCDPlayer(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Commander Damage</DialogTitle>
            <DialogDescription>
              {`Adjust damage dealt to ${players[activeCDPlayer!]?.name ?? "player"}.`}
            </DialogDescription>
          </DialogHeader>
          {activeCDPlayer !== null && (
            <div className="space-y-2">{renderCommanderDamageRows(activeCDPlayer)}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
