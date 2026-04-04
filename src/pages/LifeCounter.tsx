import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, RotateCw, Skull, Swords, X } from "lucide-react";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import { CommanderCameraScanner } from "@/components/games/CommanderCameraScanner";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsLandscapeMobile, useIsSmallDevice } from "@/hooks/use-mobile";
import { getCardByName } from "@/lib/scryfall";
import { cn } from "@/lib/utils";
import type { ManaColor } from "@/types";

type PlayerCount = 2 | 3 | 4 | 5 | 6;

interface AssignedCommander {
  name: string;
  colorIdentity: ManaColor[];
  imageUrl: string | null;
  artCropUrl: string | null;
}

interface PlayerState {
  name: string;
  life: number;
  poison: number;
  assignedCommander: AssignedCommander | null;
}

interface CommanderAssignError {
  playerIndex: number;
  message: string;
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
    assignedCommander: prev[index]?.assignedCommander ?? null,
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

// ── Hold-to-repeat hook ────────────────────────────────────────────────────

function useHoldRepeat(callback: () => void) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clear() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function start() {
    callbackRef.current();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => callbackRef.current(), 80);
    }, 600);
  }

  useEffect(() => clear, []);

  return { start, clear };
}

// ── Menu bottom sheet ──────────────────────────────────────────────────────

function MobileMenuSheet({
  open,
  onClose,
  playerCount,
  onSetPlayerCount,
  onOpenCommanders,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  playerCount: PlayerCount;
  onSetPlayerCount: (count: PlayerCount) => void;
  onOpenCommanders: () => void;
  onReset: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[60vh] overflow-y-auto rounded-t-xl px-4 pb-8 pt-4"
      >
        <SheetHeader className="mb-3">
          <SheetTitle>Game Menu</SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          {/* Player count */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Players</span>
            <Select
              value={String(playerCount)}
              onValueChange={(v) => onSetPlayerCount(Number(v) as PlayerCount)}
            >
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([2, 3, 4, 5, 6] as PlayerCount[]).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => { onOpenCommanders(); onClose(); }}
          >
            Assign Commanders
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => { onReset(); onClose(); }}
          >
            Reset Game
          </Button>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── SideCard ───────────────────────────────────────────────────────────────

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

// ── Mobile player card ─────────────────────────────────────────────────────

function MobilePlayerCard({
  player,
  index,
  allPlayers,
  commanderDamage,
  eliminated,
  onAdjustLife,
  onAdjustPoison,
  onAdjustCD,
  overlayOpen,
  onToggleOverlay,
  rotation,
}: {
  player: PlayerState;
  index: number;
  allPlayers: PlayerState[];
  commanderDamage: number[][];
  eliminated: boolean;
  onAdjustLife: (delta: number) => void;
  onAdjustPoison: (delta: number) => void;
  onAdjustCD: (sourceIndex: number, delta: number) => void;
  overlayOpen: boolean;
  onToggleOverlay: () => void;
  rotation: "0" | "180" | "side";
}) {
  const panelColor = PANEL_THEMES[index % PANEL_THEMES.length];
  const commanderImage =
    player.assignedCommander?.artCropUrl ?? player.assignedCommander?.imageUrl ?? null;

  const mainBtnClass =
    "h-14 w-14 touch-none text-2xl font-bold text-white hover:bg-black/20 hover:text-white";
  const quickBtnClass =
    "touch-none h-7 px-2 text-xs font-semibold text-white/80 hover:bg-black/20 hover:text-white";

  const decHold = useHoldRepeat(() => onAdjustLife(-1));
  const incHold = useHoldRepeat(() => onAdjustLife(1));

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none flex-col items-center overflow-hidden rounded-lg border p-1 text-white shadow-sm",
        panelColor,
        eliminated && "opacity-60 grayscale",
        rotation === "180" && "rotate-180",
      )}
    >
      {commanderImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${commanderImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/65" />
        </>
      )}

      {eliminated && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/25">
          <span className="text-destructive text-sm font-black tracking-wider">OUT</span>
        </div>
      )}

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* ── Zone A: name + life total + ±5 ───────────────────────── */}
        <div className="flex shrink-0 flex-col items-center gap-0.5 py-1">
          {/* Player / commander name */}
          <div className="w-full text-center">
            <p className="truncate text-xs font-semibold">{player.name}</p>
            {player.assignedCommander ? (
              <p className="mt-0.5 w-full truncate text-[10px] text-white/80">
                {player.assignedCommander.name}
              </p>
            ) : (
              <p className="truncate text-[10px] text-white/55">No commander set</p>
            )}
          </div>

          {/* Life total with hold-to-repeat +/- */}
          <div className="flex w-full items-center justify-between px-1">
            <Button
              variant="ghost"
              className={mainBtnClass}
              onPointerDown={decHold.start}
              onPointerUp={decHold.clear}
              onPointerLeave={decHold.clear}
            >
              −
            </Button>
            <span className="text-5xl font-bold tabular-nums drop-shadow-sm">
              {player.life}
            </span>
            <Button
              variant="ghost"
              className={mainBtnClass}
              onPointerDown={incHold.start}
              onPointerUp={incHold.clear}
              onPointerLeave={incHold.clear}
            >
              +
            </Button>
          </div>

          {/* ±5 quick adjust */}
          <div className="flex w-full items-center justify-center gap-3">
            <Button
              variant="ghost"
              className={quickBtnClass}
              onClick={() => onAdjustLife(-5)}
            >
              −5
            </Button>
            <Button
              variant="ghost"
              className={quickBtnClass}
              onClick={() => onAdjustLife(5)}
            >
              +5
            </Button>
          </div>
        </div>

        {/* ── Zone B: tap to reveal counters ────────────────────────── */}
        <div
          className="relative min-h-8 flex-1 cursor-pointer"
          onClick={onToggleOverlay}
        >
          {overlayOpen ? (
            <div
              className="absolute inset-0 z-10 flex flex-col gap-0.5 overflow-y-auto rounded-b-lg bg-black/75 px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Poison */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-semibold">
                  <Skull className="h-3 w-3" />
                  Poison
                  {player.poison >= 10 && (
                    <span className="ml-1 text-destructive">ELIM</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); onAdjustPoison(-1); }}
                  >
                    −
                  </Button>
                  <span className={cn(
                    "w-5 text-center text-xs tabular-nums font-bold",
                    player.poison >= 10 && "text-destructive",
                  )}>
                    {player.poison}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); onAdjustPoison(1); }}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Commander damage rows */}
              {allPlayers.map((opponent, opponentIndex) => {
                if (opponentIndex === index) return null;
                const dmg = commanderDamage[index]?.[opponentIndex] ?? 0;
                const lethal = dmg >= 21;
                return (
                  <div key={opponentIndex} className="flex items-center justify-between">
                    <span className={cn(
                      "flex max-w-[55%] items-center gap-1 truncate text-[10px]",
                      lethal && "text-destructive",
                    )}>
                      <Swords className="h-3 w-3 shrink-0" />
                      <span className="truncate">{opponent.name}{lethal && " ✕"}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={(e) => { e.stopPropagation(); onAdjustCD(opponentIndex, -1); }}
                      >
                        −
                      </Button>
                      <span className={cn(
                        "w-5 text-center text-xs tabular-nums font-bold",
                        lethal && "text-destructive",
                      )}>
                        {dmg}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={(e) => { e.stopPropagation(); onAdjustCD(opponentIndex, 1); }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center gap-2 opacity-40">
              {player.poison > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Skull className="h-3 w-3" />{player.poison}
                </span>
              )}
              {commanderDamage[index]?.some((d, i) => i !== index && d > 0) && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Swords className="h-3 w-3" />
                </span>
              )}
              <span className="text-[9px] text-white/60">▾</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

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
  const [commandersOpen, setCommandersOpen] = useState(false);
  const [scannerPlayerIndex, setScannerPlayerIndex] = useState<number | null>(null);
  const [commanderAssignError, setCommanderAssignError] =
    useState<CommanderAssignError | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeOverlayPlayer, setActiveOverlayPlayer] = useState<number | null>(null);

  const isSmallDevice = useIsSmallDevice();
  const isLandscape = useIsLandscapeMobile();

  const [windowHeight, setWindowHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    function onResize() { setWindowHeight(window.innerHeight); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock to landscape on mobile
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
    setActiveOverlayPlayer(null);
  }, [playerCount]);

  useEffect(() => {
    if (activeCDPlayer !== null && activeCDPlayer >= playerCount) {
      setActiveCDPlayer(null);
    }
  }, [activeCDPlayer, playerCount]);

  useEffect(() => {
    if (scannerPlayerIndex !== null && scannerPlayerIndex >= playerCount) {
      setScannerPlayerIndex(null);
    }
  }, [scannerPlayerIndex, playerCount]);

  useEffect(() => {
    if (!isSmallDevice || isLandscape) return;
    setCommandersOpen(false);
    setScannerPlayerIndex(null);
    setMenuOpen(false);
    setActiveOverlayPlayer(null);
  }, [isLandscape, isSmallDevice]);

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

  function updateAssignedCommander(index: number, commander: AssignedCommander | null) {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, assignedCommander: commander } : player,
      ),
    );
  }

  function openCommandersDialog() {
    setCommanderAssignError(null);
    setCommandersOpen(true);
  }

  function openScannerForPlayer(index: number) {
    setCommanderAssignError(null);
    setScannerPlayerIndex(index);
  }

  function clearAssignedCommander(index: number) {
    updateAssignedCommander(index, null);
    setCommanderAssignError((prev) => (prev?.playerIndex === index ? null : prev));
  }

  async function handleCommanderScanned(cardName: string) {
    const playerIndex = scannerPlayerIndex;
    if (playerIndex === null) return;
    setCommanderAssignError(null);
    const card = await getCardByName(cardName);
    if (!card) {
      setCommanderAssignError({
        playerIndex,
        message: `Could not load card details for "${cardName}". Try again.`,
      });
      return;
    }
    updateAssignedCommander(playerIndex, {
      name: card.name,
      colorIdentity: card.colorIdentity as ManaColor[],
      imageUrl: card.imageUrl || null,
      artCropUrl: card.artCropUrl || null,
    });
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
    setActiveOverlayPlayer(null);
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
            <p className={cn("text-xs", isLethal ? "text-destructive" : "text-muted-foreground")}>
              {isLethal ? "Lethal damage (21+)" : "Damage received"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              className="h-9 w-9 text-lg md:h-12 md:w-12 md:text-xl"
              onClick={() => adjustCommanderDamage(receiverIndex, opponentIndex, -1)}
            >
              -
            </Button>
            <span className={cn("w-8 text-center text-lg font-semibold md:w-10 md:text-xl", isLethal && "text-destructive")}>
              {damage}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-9 w-9 text-lg md:h-12 md:w-12 md:text-xl"
              onClick={() => adjustCommanderDamage(receiverIndex, opponentIndex, 1)}
            >
              +
            </Button>
          </div>
        </div>
      );
    });
  }

  // ── Mobile branch ────────────────────────────────────────────────────────

  if (isSmallDevice) {
    const config = GRID_CONFIGS[playerCount];
    return (
      <div
        className="fixed inset-x-0 top-0 flex flex-col bg-background"
        style={{ height: windowHeight }}
      >
        {/* Portrait overlay */}
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
              <p className="max-w-xs text-xs text-muted-foreground">
                Commander scanning is available from the landscape toolbar.
              </p>
            </div>
          </div>
        )}

        {/* Compact top bar — sidebar trigger + single menu button */}
        <div className="flex shrink-0 items-center justify-between border-b px-2 py-1">
          <SidebarTrigger className="h-8 w-8" />
          <Button
            variant="ghost"
            className="h-8 px-3 text-sm font-medium"
            onClick={() => setMenuOpen(true)}
          >
            ☰ Menu
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
                allPlayers={players}
                commanderDamage={commanderDamage}
                eliminated={eliminated}
                onAdjustLife={(delta) => adjustLife(index, delta)}
                onAdjustPoison={(delta) => adjustPoison(index, delta)}
                onAdjustCD={(sourceIndex, delta) =>
                  adjustCommanderDamage(index, sourceIndex, delta)
                }
                overlayOpen={activeOverlayPlayer === index}
                onToggleOverlay={() =>
                  setActiveOverlayPlayer((prev) => (prev === index ? null : index))
                }
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

        {/* Menu sheet */}
        <MobileMenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          playerCount={playerCount}
          onSetPlayerCount={setPlayerCount}
          onOpenCommanders={openCommandersDialog}
          onReset={resetGame}
        />

        {/* Assign commanders dialog */}
        <Dialog
          open={commandersOpen}
          onOpenChange={(open) => {
            setCommandersOpen(open);
            if (!open) {
              setCommanderAssignError(null);
              setScannerPlayerIndex(null);
            }
          }}
        >
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Commanders</DialogTitle>
              <DialogDescription>
                Scan each player&apos;s commander for this life counter session.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {players.slice(0, playerCount).map((player, index) => {
                const rowError =
                  commanderAssignError?.playerIndex === index
                    ? commanderAssignError.message
                    : null;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/80 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{player.name}</p>
                      {player.assignedCommander ? (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="truncate text-xs text-muted-foreground">
                            {player.assignedCommander.name}
                          </p>
                          <ManaSymbols
                            colorIdentity={player.assignedCommander.colorIdentity}
                            size="sm"
                          />
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No commander assigned
                        </p>
                      )}
                      {rowError && (
                        <p className="mt-1 text-xs text-destructive">{rowError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {player.assignedCommander && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => clearAssignedCommander(index)}
                          aria-label={`Clear ${player.name}'s commander`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={scannerPlayerIndex === index ? "secondary" : "outline"}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => openScannerForPlayer(index)}
                        aria-label={`Scan commander for ${player.name}`}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <CommanderCameraScanner
          open={scannerPlayerIndex !== null}
          onOpenChange={(open) => { if (!open) setScannerPlayerIndex(null); }}
          onCardScanned={(cardName) => { void handleCommanderScanned(cardName); }}
        />
      </div>
    );
  }

  // ── Desktop branch (unchanged) ───────────────────────────────────────────

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
