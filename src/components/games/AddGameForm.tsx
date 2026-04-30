import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import {
  OpponentRow,
  emptyOpponentEntry,
  type OpponentEntry,
} from "@/components/games/OpponentRow";
import { buildColorString, cn } from "@/lib/utils";
import type { Deck, Game } from "@/types";

interface AddGameFormProps {
  decks: Deck[];
  podBuddies: string[];
  onlineFriends: string[];
  onSubmit: (game: Omit<Game, "id">) => Promise<void>;
  submitting: boolean;
}

function todayString() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
}

export function AddGameForm({
  decks,
  podBuddies,
  onlineFriends,
  onSubmit,
  submitting,
}: AddGameFormProps) {
  const [date, setDate] = useState(todayString);
  const [deckId, setDeckId] = useState<string>("");
  const [opponents, setOpponents] = useState<OpponentEntry[]>([]);
  const [won, setWon] = useState(false);
  const [winningCommanderName, setWinningCommanderName] = useState<
    string | null
  >(null);

  const selectedDeck = decks.find((d) => d.id === Number(deckId));

  // Deduplicated flat list of all buddies (pod first, then online-only)
  const allBuddies = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const name of [...podBuddies, ...onlineFriends]) {
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
    return result;
  }, [podBuddies, onlineFriends]);

  // Any row with either a name or a commander counts as a filled opponent
  const filledOpponents = opponents.filter(
    (o) => o.name.trim() !== "" || o.commanderName.trim() !== "",
  );
  const totalPlayers = filledOpponents.length + 1;

  const isValid =
    date !== "" &&
    selectedDeck !== undefined &&
    filledOpponents.length >= 1 &&
    (won || winningCommanderName !== null);

  // ── Buddy chip helpers ─────────────────────────────────

  function isBuddySelected(name: string) {
    return opponents.some((o) => o.name === name);
  }

  function toggleBuddy(name: string) {
    setOpponents((prev) => {
      const idx = prev.findIndex((o) => o.name === name);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { ...emptyOpponentEntry(), name }];
    });
  }

  // ── Opponent row helpers ───────────────────────────────

  function addOpponent() {
    setOpponents((prev) => [...prev, emptyOpponentEntry()]);
  }

  function removeOpponent(index: number) {
    setOpponents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOpponent(index: number, entry: OpponentEntry) {
    setOpponents((prev) => prev.map((o, i) => (i === index ? entry : o)));
  }

  // Clear winning commander if its opponent entry is removed
  useEffect(() => {
    if (
      winningCommanderName !== null &&
      !filledOpponents.some((o) => o.commanderName === winningCommanderName)
    ) {
      setWinningCommanderName(null);
    }
  }, [filledOpponents, winningCommanderName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !selectedDeck) return;

    let winnerColorIdentity: string;
    let winningCommander: string | null = null;

    if (won) {
      winnerColorIdentity = buildColorString(
        selectedDeck.commander.colorIdentity,
      );
    } else {
      const winningOpp = filledOpponents.find(
        (o) => o.commanderName === winningCommanderName,
      );
      winnerColorIdentity =
        winningOpp && winningOpp.commanderColorIdentity.length > 0
          ? buildColorString(winningOpp.commanderColorIdentity)
          : "C";
      winningCommander = winningCommanderName?.trim() ?? null;
    }

    const game: Omit<Game, "id"> = {
      date,
      myDeck: {
        id: selectedDeck.id,
        name: selectedDeck.name,
        commander: {
          name: selectedDeck.commander.name,
          colorIdentity: selectedDeck.commander.colorIdentity,
        },
      },
      won,
      winnerColorIdentity,
      ...(winningCommander ? { winningCommander } : {}),
      opponents: filledOpponents.map((opp) => ({
        name: opp.name.trim(),
        ...(opp.commanderName ? { commander: opp.commanderName } : {}),
        ...(opp.commanderColorIdentity.length > 0
          ? { colorIdentity: opp.commanderColorIdentity }
          : {}),
      })),
      totalPlayers,
    };

    await onSubmit(game);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Date */}
      <div className="max-w-xs space-y-2">
        <label htmlFor="game-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="game-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* My Deck */}
      <div className="max-w-sm space-y-2">
        <label htmlFor="game-deck" className="text-sm font-medium">
          My Deck
        </label>
        <Select value={deckId} onValueChange={setDeckId}>
          <SelectTrigger id="game-deck">
            <SelectValue placeholder="Select a deck" />
          </SelectTrigger>
          <SelectContent>
            {decks.map((deck) => (
              <SelectItem key={deck.id} value={String(deck.id)}>
                <span className="flex items-center gap-2">
                  <ManaSymbols
                    colorIdentity={deck.commander.colorIdentity}
                    size="sm"
                  />
                  <span>
                    {deck.name} — {deck.commander.name}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Opponents */}
      <div className="space-y-4">
        <label className="text-sm font-medium">Opponents</label>

        {/* Buddy chips */}
        {allBuddies.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Tap to add from your buddies</p>
            <div className="flex flex-wrap gap-2">
              {allBuddies.map((name) => {
                const selected = isBuddySelected(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleBuddy(name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Opponent rows */}
        {opponents.length > 0 && (
          <div className="space-y-2">
            {opponents.map((opp, i) => (
              <OpponentRow
                key={opp.id}
                index={i}
                entry={opp}
                onUpdate={updateOpponent}
                onRemove={removeOpponent}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOpponent}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Opponent
          </Button>
          <p className="text-muted-foreground text-xs">
            Total players: {totalPlayers}
          </p>
        </div>
      </div>

      {/* Did I win? */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={won}
          onChange={(e) => {
            setWon(e.target.checked);
            if (e.target.checked) {
              setWinningCommanderName(null);
            }
          }}
          className="accent-primary h-4 w-4 rounded"
        />
        I won this game
      </label>

      {/* Winning Commander (shown when lost) */}
      {!won && (
        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium">Winning Commander</label>
          {filledOpponents.filter((o) => o.commanderName.trim() !== "").length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Add opponent commanders above first.
            </p>
          ) : (
            <Select
              value={winningCommanderName ?? ""}
              onValueChange={(val) => setWinningCommanderName(val || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select winning commander" />
              </SelectTrigger>
              <SelectContent>
                {filledOpponents
                  .filter((opp) => opp.commanderName.trim() !== "")
                  .map((opp) => (
                    <SelectItem key={opp.commanderName} value={opp.commanderName}>
                      <span className="flex items-center gap-2">
                        {opp.commanderColorIdentity.length > 0 && (
                          <ManaSymbols
                            colorIdentity={opp.commanderColorIdentity}
                            size="sm"
                          />
                        )}
                        <span>{opp.commanderName}</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={!isValid || submitting}>
        {submitting ? "Logging..." : "Log Game"}
      </Button>
    </form>
  );
}
