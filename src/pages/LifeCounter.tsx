import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Camera, Pencil, Skull, Swords, Users, X } from "lucide-react";
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
import { useDecks } from "@/hooks/use-decks";
import { useIsLandscapeMobile, useIsSmallDevice, useIsTablet } from "@/hooks/use-mobile";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import { useUserProfile } from "@/hooks/use-user-profile";
import { getCardByName, searchCommanderNames } from "@/lib/scryfall";
import { cn } from "@/lib/utils";
import type { ManaColor, SavedCommander } from "@/types";

type PlayerCount = 2 | 3 | 4 | 5 | 6;

type AssignedCommander = SavedCommander;

/** Seat identity in the assign dialog: you, a pod buddy's name, or a guest (null). */
const ME = "__me__";
const GUEST = "__guest__";

interface PlayerState {
  name: string;
  life: number;
  poison: number;
  assignedCommander: AssignedCommander | null;
  /** `ME`, a pod buddy's name, or null for a guest seat. */
  buddy: string | null;
}

interface CommanderAssignError {
  playerIndex: number;
  message: string;
}

const DEFAULT_LIFE = 40;
const MAX_LIFE = 999;
const MIN_LIFE = -999;

function clampLife(life: number): number {
  return Math.max(MIN_LIFE, Math.min(MAX_LIFE, life));
}

// Shrink the life total as it gains characters so three digits (or a negative
// total) still fit inside the number column instead of spilling over the ± buttons.
function lifeTextClass(life: number): string {
  const len = String(life).length;
  if (len <= 2) return "text-6xl lg:text-8xl";
  if (len === 3) return "text-5xl lg:text-7xl";
  return "text-4xl lg:text-6xl";
}
const PANEL_THEMES = [
  "bg-sky-500/10 border-sky-500/25",
  "bg-rose-500/10 border-rose-500/25",
  "bg-emerald-500/10 border-emerald-500/25",
  "bg-amber-500/10 border-amber-500/25",
  "bg-violet-500/10 border-violet-500/25",
  "bg-teal-500/10 border-teal-500/25",
];

type GridPlacement = {
  colStart: number;
  rowStart: number;
  rowSpan?: number;
  rotation: "0" | "180" | "side";
};
type GridConfig = { cols: number; rows: number; players: GridPlacement[] };

// Dialogs opened from a player card are counter-rotated to match that seat, so
// the panel reads upright from where the player is actually sitting. "side"
// seats occupy the left edge, so their top must point right — same as the card.
const SEAT_DIALOG_ROTATION: Record<GridPlacement["rotation"], string> = {
  "0": "",
  "180": "rotate-180",
  side: "rotate-90",
};

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
    buddy: prev[index]?.buddy ?? null,
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
  const [confirmReset, setConfirmReset] = useState(false);

  function handleClose() {
    setConfirmReset(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl px-4 pb-6 pt-3"
      >
        <SheetHeader className="mb-2">
          <SheetTitle className="text-sm">Game Menu</SheetTitle>
        </SheetHeader>

        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">Reset all life totals and counters?</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => { onReset(); handleClose(); }}
              >
                Reset
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Players</span>
              <Select
                value={String(playerCount)}
                onValueChange={(v) => onSetPlayerCount(Number(v) as PlayerCount)}
              >
                <SelectTrigger className="h-8 w-28 text-sm">
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
              onClick={() => { onOpenCommanders(); handleClose(); }}
            >
              Assign Players
            </Button>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmReset(true)}
            >
              Reset Game
            </Button>
          </div>
        )}
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
            // Side seats sit at the left edge of the device, so the card's top
            // must point right (away from that player) for it to read upright.
            transform: "translate(-50%, -50%) rotate(90deg)",
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
  poisonCount,
  hasCDDamage,
  eliminated,
  onAdjustLife,
  onOpenPoison,
  onOpenCD,
  onOpenCustomLife,
  rotation,
}: {
  player: PlayerState;
  index: number;
  poisonCount: number;
  hasCDDamage: boolean;
  eliminated: boolean;
  onAdjustLife: (delta: number) => void;
  onOpenPoison: () => void;
  onOpenCD: () => void;
  onOpenCustomLife: () => void;
  rotation: "0" | "180" | "side";
}) {
  const panelColor = PANEL_THEMES[index % PANEL_THEMES.length];
  const commanderImage =
    player.assignedCommander?.artCropUrl ?? player.assignedCommander?.imageUrl ?? null;

  const decHold = useHoldRepeat(() => onAdjustLife(-1));
  const incHold = useHoldRepeat(() => onAdjustLife(1));

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none flex-col overflow-hidden rounded-lg border p-1 text-white shadow-sm",
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
        {/* Name row */}
        <div className="shrink-0 w-full pt-0.5 text-center">
          <p className="truncate text-xs font-semibold lg:text-sm">
            {player.assignedCommander ? player.assignedCommander.name : player.name}
          </p>
        </div>

        {/* Life total — flex-1 so it fills available height */}
        <div className="flex flex-1 items-center justify-center gap-1">
          <Button
            variant="ghost"
            className="h-full w-16 touch-none text-3xl font-bold text-white hover:bg-black/20 hover:text-white lg:w-24 lg:text-4xl"
            onPointerDown={decHold.start}
            onPointerUp={decHold.clear}
            onPointerLeave={decHold.clear}
          >
            −
          </Button>
          <span
            className={cn(
              // pointer-events-none: the drop-shadow filter lifts this above the
              // ± buttons, so it must never swallow their taps.
              "pointer-events-none w-24 text-center font-bold tabular-nums drop-shadow-sm lg:w-36",
              lifeTextClass(player.life),
            )}
          >
            {player.life}
          </span>
          <Button
            variant="ghost"
            className="h-full w-16 touch-none text-3xl font-bold text-white hover:bg-black/20 hover:text-white lg:w-24 lg:text-4xl"
            onPointerDown={incHold.start}
            onPointerUp={incHold.clear}
            onPointerLeave={incHold.clear}
          >
            +
          </Button>
        </div>

        {/* ±5 quick adjust */}
        <div className="flex shrink-0 w-full items-center justify-center gap-4 py-0.5">
          <Button
            variant="ghost"
            className="h-8 touch-none px-3 text-sm font-semibold text-white/80 hover:bg-black/20 hover:text-white lg:h-11 lg:px-5 lg:text-base"
            onClick={() => onAdjustLife(-5)}
          >
            −5
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-3 text-sm font-semibold text-white/80 hover:bg-black/20 hover:text-white lg:h-11 lg:px-5 lg:text-base"
            onClick={onOpenCustomLife}
            aria-label="Adjust life by a custom amount"
          >
            ±#
          </Button>
          <Button
            variant="ghost"
            className="h-8 touch-none px-3 text-sm font-semibold text-white/80 hover:bg-black/20 hover:text-white lg:h-11 lg:px-5 lg:text-base"
            onClick={() => onAdjustLife(5)}
          >
            +5
          </Button>
        </div>

        {/* Bottom action row: poison + commander damage buttons */}
        <div className="flex shrink-0 items-center justify-around border-t border-white/15 py-1 lg:py-2">
          <button
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-white/60 active:bg-white/10 lg:px-5 lg:py-2"
            onClick={onOpenPoison}
          >
            <Skull className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
            <span className={cn(
              "text-xs font-semibold tabular-nums lg:text-sm",
              poisonCount >= 10 ? "text-destructive" : "text-white/70",
            )}>
              {poisonCount}
            </span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-white/60 active:bg-white/10 lg:px-5 lg:py-2"
            onClick={onOpenCD}
          >
            <Swords className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
            {hasCDDamage && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 lg:h-2 lg:w-2" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Custom life amount dialog ──────────────────────────────────────────────

// On-screen keypad rather than a native input: the dialog is rotated to face
// the seat, and a device keyboard would pop up in the wrong orientation.
function CustomLifeDialog({
  playerName,
  life,
  rotation,
  large,
  onClose,
  onAdjust,
  onSet,
}: {
  playerName: string;
  life: number;
  rotation: GridPlacement["rotation"];
  /** Tablet sizing: bigger panel and keys. */
  large: boolean;
  onClose: () => void;
  onAdjust: (delta: number) => void;
  onSet: (life: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;

  function press(digit: string) {
    setAmount((prev) => (prev.length >= 3 ? prev : (prev + digit).replace(/^0+(?=\d)/, "")));
  }

  function apply(fn: () => void) {
    if (!value && amount === "") return;
    fn();
    onClose();
  }

  const keyClass = cn("font-semibold", large ? "h-16 text-2xl" : "h-12 text-xl");

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className={cn(
          large ? "w-[26rem]" : "w-80",
          rotation === "side" ? "max-w-[90vh] sm:max-w-[90vh]" : "max-w-[90vw] sm:max-w-[90vw]",
          SEAT_DIALOG_ROTATION[rotation],
        )}
      >
        <DialogHeader>
          <DialogTitle>Life — {playerName}</DialogTitle>
          <DialogDescription>
            Currently {life}
            {amount !== "" && ` → gain: ${Math.min(MAX_LIFE, life + value)} · lose: ${Math.max(MIN_LIFE, life - value)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 py-2 text-center text-4xl font-bold tabular-nums">
          {amount || <span className="text-muted-foreground">0</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button key={d} variant="outline" className={keyClass} onClick={() => press(d)}>
              {d}
            </Button>
          ))}
          <Button variant="ghost" className={keyClass} onClick={() => setAmount("")}>
            C
          </Button>
          <Button variant="outline" className={keyClass} onClick={() => press("0")}>
            0
          </Button>
          <Button variant="ghost" className={keyClass} onClick={() => setAmount((p) => p.slice(0, -1))}>
            ⌫
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="destructive"
            className="h-12"
            disabled={!value}
            onClick={() => apply(() => onAdjust(-value))}
          >
            − Lose
          </Button>
          <Button
            variant="secondary"
            className="h-12"
            disabled={amount === ""}
            onClick={() => apply(() => onSet(value))}
          >
            Set
          </Button>
          <Button
            className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!value}
            onClick={() => apply(() => onAdjust(value))}
          >
            + Gain
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LifeCounter() {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [players, setPlayers] = useState<PlayerState[]>(() => normalizePlayers(4));
  const [commanderDamage, setCommanderDamage] = useState<number[][]>(() =>
    normalizeCommanderDamage(4),
  );
  const [commandersOpen, setCommandersOpen] = useState(false);
  const [scannerPlayerIndex, setScannerPlayerIndex] = useState<number | null>(null);
  const [commanderAssignError, setCommanderAssignError] =
    useState<CommanderAssignError | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Two-step reset in the desktop toolbar; the sheet has its own confirm step.
  const [confirmReset, setConfirmReset] = useState(false);
  const [poisonDialogPlayer, setPoisonDialogPlayer] = useState<{ index: number; rotation: "0" | "180" | "side" } | null>(null);
  const [cdDialogPlayer, setCdDialogPlayer] = useState<{ index: number; rotation: "0" | "180" | "side" } | null>(null);
  const [customLifePlayer, setCustomLifePlayer] = useState<{ index: number; rotation: "0" | "180" | "side" } | null>(null);

  // Manual commander entry in Assign Commanders dialog
  const [manualEntryIdx, setManualEntryIdx] = useState<number | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<string[]>([]);
  const [manualResultsOpen, setManualResultsOpen] = useState(false);
  const manualDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSmallDevice = useIsSmallDevice();
  const isTablet = useIsTablet();
  const isLandscape = useIsLandscapeMobile();
  // Phones get the compact ☰ Menu sheet; tablets and desktops get the full toolbar.
  const compactChrome = isSmallDevice && !isTablet;

  const { podBuddies, podBuddyCommanders, addBuddyCommander } = usePodBuddies();
  const { decks } = useDecks();
  const { profile } = useUserProfile();
  const myName = profile?.username || "Me";

  // Your own commanders for the "Me" seat: active decks, one entry per commander.
  const myCommanders = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; colorIdentity: ManaColor[] }[] = [];
    for (const deck of decks) {
      if (deck.archived || seen.has(deck.commander.name)) continue;
      seen.add(deck.commander.name);
      list.push({ name: deck.commander.name, colorIdentity: deck.commander.colorIdentity });
    }
    return list;
  }, [decks]);
  const [pickingIdx, setPickingIdx] = useState<number | null>(null);

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
    setPoisonDialogPlayer(null);
    setCdDialogPlayer(null);
    setCustomLifePlayer(null);
  }, [playerCount]);

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
    setPoisonDialogPlayer(null);
    setCdDialogPlayer(null);
    setCustomLifePlayer(null);
  }, [isLandscape, isSmallDevice]);

  function updatePlayerName(index: number, name: string) {
    setPlayers((prev) =>
      prev.map((player, i) => (i === index ? { ...player, name } : player)),
    );
  }

  function adjustLife(index: number, delta: number) {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, life: clampLife(player.life + delta) } : player,
      ),
    );
  }

  function setLife(index: number, life: number) {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, life: clampLife(life) } : player,
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

  /** Save a commander to the seat's pod buddy, if the seat belongs to one. */
  function rememberForBuddy(buddy: string | null, commander: AssignedCommander) {
    if (!buddy || buddy === ME) return;
    addBuddyCommander(buddy, commander).catch(() => {});
  }

  /** Assign a commander to a seat and remember it for that seat's buddy. */
  function assignCommander(index: number, commander: AssignedCommander) {
    updateAssignedCommander(index, commander);
    rememberForBuddy(players[index]?.buddy ?? null, commander);
  }

  function selectSeatPlayer(index: number, value: string) {
    const buddy = value === GUEST ? null : value;
    const current = players[index];
    if (!current || current.buddy === buddy) return;
    // A different known person brings a different deck; a guest seat that is
    // being claimed by someone keeps its commander and saves it to them.
    const keepCommander = current.buddy === null;
    const commander = keepCommander ? current.assignedCommander : null;
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index
          ? {
              ...player,
              buddy,
              name: buddy === ME ? myName : buddy ?? `Player ${index + 1}`,
              assignedCommander: commander,
            }
          : player,
      ),
    );
    if (commander) rememberForBuddy(buddy, commander);
  }

  async function pickMyCommander(index: number, cmdr: { name: string; colorIdentity: ManaColor[] }) {
    setPickingIdx(index);
    try {
      const card = await getCardByName(cmdr.name);
      updateAssignedCommander(index, {
        name: card?.name ?? cmdr.name,
        colorIdentity: (card?.colorIdentity as ManaColor[] | undefined) ?? cmdr.colorIdentity,
        imageUrl: card?.imageUrl || null,
        artCropUrl: card?.artCropUrl || null,
      });
    } finally {
      setPickingIdx(null);
    }
  }

  function openCommandersDialog() {
    setCommanderAssignError(null);
    setManualEntryIdx(null);
    setManualQuery("");
    setManualResults([]);
    setManualResultsOpen(false);
    setCommandersOpen(true);
  }

  function closeManualEntry() {
    setManualEntryIdx(null);
    setManualQuery("");
    setManualResults([]);
    setManualResultsOpen(false);
  }

  function handleManualQueryChange(q: string) {
    setManualQuery(q);
    if (manualDebounceRef.current) clearTimeout(manualDebounceRef.current);
    if (q.length < 2) {
      setManualResults([]);
      setManualResultsOpen(false);
      return;
    }
    manualDebounceRef.current = setTimeout(async () => {
      const names = await searchCommanderNames(q);
      setManualResults(names);
      setManualResultsOpen(names.length > 0);
    }, 250);
  }

  async function handleManualCommanderSelect(name: string) {
    if (manualEntryIdx === null) return;
    const card = await getCardByName(name);
    if (!card) return;
    assignCommander(manualEntryIdx, {
      name: card.name,
      colorIdentity: card.colorIdentity as ManaColor[],
      imageUrl: card.imageUrl || null,
      artCropUrl: card.artCropUrl || null,
    });
    closeManualEntry();
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
    assignCommander(playerIndex, {
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
              ? { ...player, life: clampLife(player.life - actualDelta) }
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
    setPoisonDialogPlayer(null);
    setCdDialogPlayer(null);
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

  // ── Seating-grid layout (every device) ───────────────────────────────────

  const config = GRID_CONFIGS[playerCount];

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        // Touch devices take over the screen; on a laptop or desktop the counter
        // sits inside the app chrome and fills what's left of the viewport.
        isSmallDevice ? "fixed inset-x-0 top-0" : "h-full min-h-0",
      )}
      style={isSmallDevice ? { height: windowHeight } : undefined}
    >
      {/* Portrait overlay */}
      {isSmallDevice && !isLandscape && (
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
      {compactChrome ? (
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
      ) : (
        /* Full toolbar (tablet + desktop) — the menu sheet's controls, inline.
           Tablets get touch-sized controls and their own sidebar trigger,
           since the counter covers the app chrome there. */
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center border-b",
            isTablet ? "gap-3 px-3 py-2" : "gap-2 px-2 py-1.5",
          )}
        >
          {isTablet && <SidebarTrigger className="h-11 w-11" />}
          <span className={cn("mr-1 font-semibold", isTablet ? "text-base" : "text-sm")}>
            Life Counter
          </span>
          <Select
            value={String(playerCount)}
            onValueChange={(v) => setPlayerCount(Number(v) as PlayerCount)}
          >
            <SelectTrigger className={isTablet ? "h-11 w-36 text-base" : "h-8 w-28 text-sm"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([2, 3, 4, 5, 6] as PlayerCount[]).map((n) => (
                <SelectItem key={n} value={String(n)} className={isTablet ? "py-2.5 text-base" : undefined}>
                  {n} Players
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size={isTablet ? "lg" : "sm"}
            className={isTablet ? "h-11 text-base" : undefined}
            onClick={openCommandersDialog}
          >
            <Users className={isTablet ? "h-5 w-5" : "h-4 w-4"} />
            Assign Players
          </Button>
          <Button
            variant={confirmReset ? "destructive" : "outline"}
            size={isTablet ? "lg" : "sm"}
            className={cn("ml-auto", isTablet && "h-11 text-base")}
            onClick={() => {
              if (confirmReset) {
                resetGame();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
              }
            }}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? "Confirm reset?" : "Reset Game"}
          </Button>
        </div>
      )}

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
              poisonCount={player.poison}
              hasCDDamage={commanderDamage[index]?.some((d, i) => i !== index && d > 0) ?? false}
              eliminated={eliminated}
              onAdjustLife={(delta) => adjustLife(index, delta)}
              onOpenPoison={() => setPoisonDialogPlayer({ index, rotation: p.rotation })}
              onOpenCD={() => setCdDialogPlayer({ index, rotation: p.rotation })}
              onOpenCustomLife={() => setCustomLifePlayer({ index, rotation: p.rotation })}
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

      {/* Menu sheet — desktop gets these controls inline in the toolbar */}
      {compactChrome && (
        <MobileMenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          playerCount={playerCount}
          onSetPlayerCount={setPlayerCount}
          onOpenCommanders={openCommandersDialog}
          onReset={resetGame}
        />
      )}

      {/* Poison counter dialog */}
      {poisonDialogPlayer !== null && (() => {
        const { index: pi, rotation } = poisonDialogPlayer;
        const poison = players[pi]?.poison ?? 0;
        return (
          <Dialog open onOpenChange={(v) => { if (!v) setPoisonDialogPlayer(null); }}>
            <DialogContent
              className={cn(
                isTablet ? "w-96" : "w-72",
                // A quarter-turned panel spans the viewport's short axis, so
                // clamp its width against the height instead.
                rotation === "side" ? "max-w-[85vh] sm:max-w-[85vh]" : "max-w-[85vw] sm:max-w-[85vw]",
                SEAT_DIALOG_ROTATION[rotation],
              )}
            >
              <DialogHeader>
                <DialogTitle className={cn("flex items-center gap-2", isTablet && "text-xl")}>
                  <Skull className={isTablet ? "h-5 w-5" : "h-4 w-4"} /> Poison — {players[pi]?.name}
                </DialogTitle>
              </DialogHeader>
              <div className={cn("flex items-center justify-center py-2", isTablet ? "gap-10" : "gap-8")}>
                <Button size="icon" variant="outline"
                  className={isTablet ? "h-16 w-16 text-3xl" : "h-12 w-12 text-xl"}
                  onClick={() => adjustPoison(pi, -1)}>−</Button>
                <span className={cn("font-bold tabular-nums", isTablet ? "text-8xl" : "text-6xl", poison >= 10 && "text-destructive")}>
                  {poison}
                </span>
                <Button size="icon" variant="outline"
                  className={isTablet ? "h-16 w-16 text-3xl" : "h-12 w-12 text-xl"}
                  onClick={() => adjustPoison(pi, 1)}>+</Button>
              </div>
              {poison >= 10 && (
                <p className="text-center text-sm font-semibold text-destructive">Eliminated!</p>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Custom life amount dialog */}
      {customLifePlayer !== null && players[customLifePlayer.index] && (
        <CustomLifeDialog
          playerName={players[customLifePlayer.index].name}
          life={players[customLifePlayer.index].life}
          rotation={customLifePlayer.rotation}
          large={isTablet}
          onClose={() => setCustomLifePlayer(null)}
          onAdjust={(delta) => adjustLife(customLifePlayer.index, delta)}
          onSet={(life) => setLife(customLifePlayer.index, life)}
        />
      )}

      {/* Commander damage dialog */}
      {cdDialogPlayer !== null && (() => {
        const { index: ci, rotation } = cdDialogPlayer;
        return (
          <Dialog open onOpenChange={(v) => { if (!v) setCdDialogPlayer(null); }}>
            <DialogContent
              className={cn(
                isTablet ? "w-[28rem]" : "w-80",
                rotation === "side" ? "max-w-[90vh] sm:max-w-[90vh]" : "max-w-[90vw] sm:max-w-[90vw]",
                SEAT_DIALOG_ROTATION[rotation],
              )}
            >
              <DialogHeader>
                <DialogTitle className={cn("flex items-center gap-2", isTablet && "text-xl")}>
                  <Swords className={isTablet ? "h-5 w-5" : "h-4 w-4"} /> CMD Damage — {players[ci]?.name}
                </DialogTitle>
              </DialogHeader>
              <div className={cn("py-1", isTablet ? "space-y-3" : "space-y-2")}>
                {players.map((opponent, oppIdx) => {
                  if (oppIdx === ci) return null;
                  const dmg = commanderDamage[ci]?.[oppIdx] ?? 0;
                  const lethal = dmg >= 21;
                  return (
                    <div key={oppIdx} className="flex items-center gap-2">
                      <span className={cn("min-w-0 flex-1 break-words font-medium leading-tight", isTablet ? "text-base" : "text-sm", lethal && "text-destructive")}>
                        {opponent.assignedCommander?.name ?? opponent.name}{lethal && " ✕"}
                      </span>
                      <div className={cn("flex shrink-0 items-center", isTablet ? "gap-3" : "gap-2")}>
                        <Button variant="outline" size="icon"
                          className={isTablet ? "h-12 w-12 text-xl" : "h-9 w-9"}
                          onClick={() => adjustCommanderDamage(ci, oppIdx, -1)}>−</Button>
                        <span className={cn("text-center font-bold tabular-nums", isTablet ? "w-10 text-2xl" : "w-7 text-base", lethal && "text-destructive")}>
                          {dmg}
                        </span>
                        <Button variant="outline" size="icon"
                          className={isTablet ? "h-12 w-12 text-xl" : "h-9 w-9"}
                          onClick={() => adjustCommanderDamage(ci, oppIdx, 1)}>+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Assign commanders dialog */}
      <Dialog
        open={commandersOpen}
        onOpenChange={(open) => {
          setCommandersOpen(open);
          if (!open) {
            setCommanderAssignError(null);
            setScannerPlayerIndex(null);
            closeManualEntry();
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[85vh] overflow-y-auto",
            isTablet ? "sm:max-w-2xl" : "sm:max-w-md",
          )}
        >
          <DialogHeader>
            <DialogTitle className={isTablet ? "text-xl" : undefined}>
              Players &amp; Commanders
            </DialogTitle>
            <DialogDescription>
              Pick who's in each seat, then tap one of their saved commanders —
              or type or scan a new one. New commanders are saved to that pod
              buddy for next time.
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
                  className="rounded-lg border border-border/70 bg-background/80 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={cn("flex", isTablet ? "gap-2" : "gap-1.5")}>
                        <Select
                          value={player.buddy ?? GUEST}
                          onValueChange={(v) => selectSeatPlayer(index, v)}
                        >
                          <SelectTrigger
                            aria-label={`Who is in seat ${index + 1}`}
                            className={cn(
                              "shrink-0",
                              isTablet ? "h-11 w-44 text-base" : "h-8 w-28 text-sm",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ME} className={isTablet ? "py-2.5 text-base" : undefined}>
                              {myName} (me)
                            </SelectItem>
                            {podBuddies.map((buddy) => (
                              <SelectItem key={buddy} value={buddy} className={isTablet ? "py-2.5 text-base" : undefined}>
                                {buddy}
                              </SelectItem>
                            ))}
                            <SelectItem value={GUEST} className={isTablet ? "py-2.5 text-base" : undefined}>
                              Guest
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={player.name}
                          onChange={(e) => updatePlayerName(index, e.target.value)}
                          aria-label={`Name for player ${index + 1}`}
                          className={cn("min-w-0 font-medium", isTablet ? "h-11 text-base" : "h-8 text-sm")}
                        />
                      </div>
                      {player.assignedCommander ? (
                        <div className="mt-1 flex items-center gap-2">
                          <p className={cn("truncate text-muted-foreground", isTablet ? "text-sm" : "text-xs")}>
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
                          className={isTablet ? "h-11 w-11" : "h-9 w-9"}
                          onClick={() => clearAssignedCommander(index)}
                          aria-label={`Clear ${player.name}'s commander`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={manualEntryIdx === index ? "secondary" : "outline"}
                        size="icon"
                        className={isTablet ? "h-11 w-11" : "h-9 w-9"}
                        onClick={() => {
                          if (manualEntryIdx === index) {
                            closeManualEntry();
                          } else {
                            closeManualEntry();
                            setManualEntryIdx(index);
                          }
                        }}
                        aria-label={`Type commander name for ${player.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={scannerPlayerIndex === index ? "secondary" : "outline"}
                        size="icon"
                        className={isTablet ? "h-11 w-11" : "h-9 w-9"}
                        onClick={() => openScannerForPlayer(index)}
                        aria-label={`Scan commander for ${player.name}`}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(() => {
                    // One-tap commanders for whoever is in this seat.
                    const options: { name: string; colorIdentity: ManaColor[]; saved?: AssignedCommander }[] =
                      player.buddy === ME
                        ? myCommanders
                        : player.buddy
                          ? (podBuddyCommanders[player.buddy] ?? []).map((c) => ({ ...c, saved: c }))
                          : [];
                    if (!player.buddy) return null;
                    if (options.length === 0) {
                      return (
                        <p className={cn("mt-2 text-muted-foreground", isTablet ? "text-sm" : "text-xs")}>
                          {player.buddy === ME
                            ? "No active decks yet."
                            : "No saved commanders yet. Type or scan one and it'll be saved here."}
                        </p>
                      );
                    }
                    return (
                      <div className={cn("mt-2 flex flex-wrap", isTablet ? "gap-2" : "gap-1.5")}>
                        {options.map((opt) => {
                          const active = player.assignedCommander?.name === opt.name;
                          return (
                            <button
                              key={opt.name}
                              type="button"
                              disabled={pickingIdx === index}
                              onClick={() => {
                                if (opt.saved) assignCommander(index, opt.saved);
                                else void pickMyCommander(index, opt);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 rounded-full border transition-colors disabled:opacity-60",
                                isTablet ? "px-3.5 py-2 text-sm" : "px-2.5 py-1 text-xs",
                                active
                                  ? "border-primary bg-primary/15 font-semibold"
                                  : "border-border bg-muted/50 hover:bg-muted",
                              )}
                            >
                              <span className="max-w-[14rem] truncate">{opt.name}</span>
                              <ManaSymbols colorIdentity={opt.colorIdentity} size="sm" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {manualEntryIdx === index && (
                    <div className="relative mt-2">
                      <Input
                        autoFocus
                        placeholder="Type commander name…"
                        className={isTablet ? "h-11 text-base" : undefined}
                        value={manualQuery}
                        onChange={(e) => handleManualQueryChange(e.target.value)}
                      />
                      {manualResultsOpen && (
                        <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
                          {manualResults.map((name) => (
                            <li
                              key={name}
                              className={cn("cursor-pointer px-3 hover:bg-accent", isTablet ? "py-2.5 text-base" : "py-1.5 text-sm")}
                              onMouseDown={() => void handleManualCommanderSelect(name)}
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
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
