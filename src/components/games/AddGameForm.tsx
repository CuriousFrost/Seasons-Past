import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddBuddyDialog } from "@/components/games/AddBuddyDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommanderSearch } from "@/components/commanders/CommanderSearch";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import {
  OpponentRow,
  emptyOpponentEntry,
  type OpponentEntry,
} from "@/components/games/OpponentRow";
import { fetchCommanderByName } from "@/lib/scryfall";
import { buildColorString } from "@/lib/utils";
import type { Commander, Deck, Game } from "@/types";

interface AddGameFormProps {
  decks: Deck[];
  podBuddies: string[];
  onlineFriends: string[];
  onSubmit: (game: Omit<Game, "id">) => Promise<void>;
  submitting: boolean;
}

function todayString() {
  return new Date().toISOString().split("T")[0];
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
  const [opponents, setOpponents] = useState<OpponentEntry[]>([
    emptyOpponentEntry(),
  ]);
  const [won, setWon] = useState(false);
  const [buddyDialogOpen, setBuddyDialogOpen] = useState(false);
  const [winningCommanderName, setWinningCommanderName] = useState<
    string | null
  >(null);
  const [winningCommanderData, setWinningCommanderData] =
    useState<Commander | null>(null);
  const [fetchingCommander, setFetchingCommander] = useState(false);

  const selectedDeck = decks.find((d) => d.id === Number(deckId));

  const filledOpponents = opponents.filter(
    (o) => o.commanderName.trim() !== "",
  );
  const totalPlayers = filledOpponents.length + 1;

  const isValid =
    date !== "" &&
    selectedDeck !== undefined &&
    filledOpponents.length >= 1 &&
    (won || winningCommanderName !== null);

  function addOpponent() {
    setOpponents((prev) => [...prev, emptyOpponentEntry()]);
  }

  function removeOpponent(index: number) {
    setOpponents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOpponent(index: number, entry: OpponentEntry) {
    setOpponents((prev) => prev.map((o, i) => (i === index ? entry : o)));
  }

  function fillOpponentName(name: string) {
    setOpponents((prev) => {
      const emptyIdx = prev.findIndex((o) => o.name.trim() === "");
      if (emptyIdx >= 0) {
        return prev.map((o, i) =>
          i === emptyIdx ? { ...o, name } : o,
        );
      }
      return [...prev, { ...emptyOpponentEntry(), name }];
    });
  }

  async function handleCommanderSelect(name: string) {
    setWinningCommanderName(name);
    setFetchingCommander(true);
    try {
      const data = await fetchCommanderByName(name);
      setWinningCommanderData(data);
    } finally {
      setFetchingCommander(false);
    }
  }

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
      winnerColorIdentity = winningCommanderData
        ? buildColorString(winningCommanderData.colorIdentity)
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Opponents</label>
        <div className="space-y-3">
          {opponents.map((opp, i) => (
            <OpponentRow
              key={i}
              index={i}
              entry={opp}
              canRemove={opponents.length > 1}
              onUpdate={updateOpponent}
              onRemove={removeOpponent}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOpponent}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Opponent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBuddyDialogOpen(true)}
          >
            <Users className="mr-1 h-4 w-4" />
            Add Buddy
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Total players: {totalPlayers}
        </p>
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
              setWinningCommanderData(null);
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
          <CommanderSearch onSelect={handleCommanderSelect} />
          {fetchingCommander && (
            <p className="text-muted-foreground text-xs">
              Loading commander data...
            </p>
          )}
          {winningCommanderData && winningCommanderName && (
            <div className="flex items-center gap-2 text-sm">
              <ManaSymbols
                colorIdentity={winningCommanderData.colorIdentity}
              />
              <span>{winningCommanderName}</span>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={!isValid || submitting}>
        {submitting ? "Logging..." : "Log Game"}
      </Button>

      <AddBuddyDialog
        open={buddyDialogOpen}
        onClose={() => setBuddyDialogOpen(false)}
        podBuddies={podBuddies}
        onlineFriends={onlineFriends}
        onSelect={fillOpponentName}
      />
    </form>
  );
}
