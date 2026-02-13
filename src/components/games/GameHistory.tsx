import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommanderSearch } from "@/components/commanders/CommanderSearch";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import {
  OpponentRow,
  emptyOpponentEntry,
  type OpponentEntry,
} from "@/components/games/OpponentRow";
import { fetchCommanderByName } from "@/lib/scryfall";
import { buildColorString } from "@/lib/utils";
import type { Commander, Deck, Game, ManaColor } from "@/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type SortKey = "date" | "deck" | "opponents" | "players" | "result";

type ResultFilter = "all" | "win" | "loss";

interface GameHistoryProps {
  games: Game[];
  decks: Deck[];
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: number) => void;
}

function formatDate(date: string) {
  if (!date) return "";
  const normalized = date.includes("T") ? date : `${date}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return date;
  return dateFormatter.format(parsed);
}

function opponentToEntry(opp: {
  name: string;
  commander?: string;
  colorIdentity?: ManaColor[];
}): OpponentEntry {
  const hasCommander = !!opp.commander;
  return {
    name: hasCommander ? opp.name : "",
    commanderName: opp.commander ?? opp.name,
    commanderColorIdentity: (opp.colorIdentity ?? []) as ManaColor[],
  };
}

export function GameHistory({
  games,
  decks,
  onEditGame,
  onDeleteGame,
}: GameHistoryProps) {
  const [yearFilter, setYearFilter] = useState("all");
  const [deckFilter, setDeckFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [podBuddyFilter, setPodBuddyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDeckId, setEditDeckId] = useState("");
  const [editOpponents, setEditOpponents] = useState<OpponentEntry[]>([
    emptyOpponentEntry(),
  ]);
  const [editWon, setEditWon] = useState(false);
  const [editWinningCommanderName, setEditWinningCommanderName] = useState<
    string | null
  >(null);
  const [editWinningCommanderData, setEditWinningCommanderData] =
    useState<Commander | null>(null);
  const [fetchingCommander, setFetchingCommander] = useState(false);

  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  const years = useMemo(() => {
    const set = new Set<string>();
    games.forEach((game) => {
      if (game.date && game.date.length >= 4) {
        set.add(game.date.slice(0, 4));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [games]);

  const deckOptions = useMemo(
    () =>
      decks
        .map((deck) => ({
          id: String(deck.id),
          name: deck.name,
          commanderName: deck.commander.name,
          colorIdentity: deck.commander.colorIdentity,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [decks],
  );

  const editDeckOptions = useMemo(() => {
    if (!editingGame) return deckOptions;
    if (
      deckOptions.some((deck) => deck.id === String(editingGame.myDeck.id))
    ) {
      return deckOptions;
    }
    return [
      {
        id: String(editingGame.myDeck.id),
        name: `${editingGame.myDeck.name} (missing)`,
        commanderName: editingGame.myDeck.commander.name,
        colorIdentity: editingGame.myDeck.commander.colorIdentity,
      },
      ...deckOptions,
    ];
  }, [deckOptions, editingGame]);

  const podBuddyOptions = useMemo(() => {
    const set = new Set<string>();
    games.forEach((game) => {
      game.opponents.forEach((opp) => {
        const trimmed = opp.name.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [games]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (yearFilter !== "all" && game.date.slice(0, 4) !== yearFilter) {
        return false;
      }
      if (deckFilter !== "all" && String(game.myDeck.id) !== deckFilter) {
        return false;
      }
      if (resultFilter === "win" && !game.won) return false;
      if (resultFilter === "loss" && game.won) return false;
      if (
        podBuddyFilter !== "all" &&
        !game.opponents.some((opp) => opp.name === podBuddyFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [games, yearFilter, deckFilter, resultFilter, podBuddyFilter]);

  const sortedGames = useMemo(() => {
    const sortable = [...filteredGames];

    const compare = (a: Game, b: Game) => {
      switch (sortKey) {
        case "date": {
          const aTime = Date.parse(`${a.date}T00:00:00`);
          const bTime = Date.parse(`${b.date}T00:00:00`);
          return aTime - bTime;
        }
        case "deck":
          return a.myDeck.name.localeCompare(b.myDeck.name);
        case "opponents": {
          const aCmds = a.opponents.map((o) => o.commander ?? o.name).join(", ");
          const bCmds = b.opponents.map((o) => o.commander ?? o.name).join(", ");
          return aCmds.localeCompare(bCmds);
        }
        case "players":
          return a.totalPlayers - b.totalPlayers;
        case "result":
          return Number(a.won) - Number(b.won);
        default:
          return 0;
      }
    };

    sortable.sort((a, b) => {
      const result = compare(a, b);
      return sortDirection === "asc" ? result : -result;
    });

    return sortable;
  }, [filteredGames, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDirection("asc");
      return key;
    });
  }

  function openEdit(game: Game) {
    setEditingGame(game);
    setEditDate(game.date);
    setEditDeckId(String(game.myDeck.id));
    setEditOpponents(
      game.opponents.length > 0
        ? game.opponents.map(opponentToEntry)
        : [emptyOpponentEntry()],
    );
    setEditWon(game.won);
    setEditWinningCommanderName(game.winningCommander ?? null);
    setEditWinningCommanderData(null);
  }

  function addEditOpponent() {
    setEditOpponents((prev) => [...prev, emptyOpponentEntry()]);
  }

  function removeEditOpponent(index: number) {
    setEditOpponents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEditOpponent(index: number, entry: OpponentEntry) {
    setEditOpponents((prev) =>
      prev.map((opp, i) => (i === index ? entry : opp)),
    );
  }

  async function handleEditCommanderSelect(name: string) {
    setEditWinningCommanderName(name);
    setFetchingCommander(true);
    try {
      const data = await fetchCommanderByName(name);
      setEditWinningCommanderData(data);
    } finally {
      setFetchingCommander(false);
    }
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingGame) return;

    const filledOpponents = editOpponents.filter(
      (o) => o.commanderName.trim() !== "",
    );
    const totalPlayers = filledOpponents.length + 1;
    const selectedDeck =
      decks.find((deck) => deck.id === Number(editDeckId)) ??
      editingGame.myDeck;

    let winnerColorIdentity: string;
    let winningCommander: string | undefined;

    if (editWon) {
      winnerColorIdentity = buildColorString(
        selectedDeck.commander.colorIdentity,
      );
    } else {
      winnerColorIdentity = editWinningCommanderData
        ? buildColorString(editWinningCommanderData.colorIdentity)
        : editingGame.winnerColorIdentity;
      winningCommander = editWinningCommanderName ?? undefined;
    }

    const updatedGame: Game = {
      id: editingGame.id,
      date: editDate,
      myDeck: {
        id: selectedDeck.id,
        name: selectedDeck.name,
        commander: {
          name: selectedDeck.commander.name,
          colorIdentity: selectedDeck.commander.colorIdentity,
        },
      },
      won: editWon,
      winnerColorIdentity,
      winningCommander,
      opponents: filledOpponents.map((opp) => ({
        name: opp.name.trim(),
        ...(opp.commanderName ? { commander: opp.commanderName } : {}),
        ...(opp.commanderColorIdentity.length > 0
          ? { colorIdentity: opp.commanderColorIdentity }
          : {}),
      })),
      totalPlayers,
    };

    onEditGame(updatedGame);
    setEditingGame(null);
  }

  const filledEditOpponents = editOpponents.filter(
    (o) => o.commanderName.trim() !== "",
  );
  const editIsValid =
    editDate !== "" &&
    editDeckId !== "" &&
    filledEditOpponents.length >= 1 &&
    (editWon || editWinningCommanderName !== null);

  function OpponentsList({ opponents }: { opponents: Game["opponents"] }) {
    return (
      <div className="space-y-1">
        {opponents.map((opp, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {opp.colorIdentity && opp.colorIdentity.length > 0 && (
              <ManaSymbols colorIdentity={opp.colorIdentity} size="sm" />
            )}
            <span className="text-sm">{opp.commander ?? opp.name}</span>
          </div>
        ))}
      </div>
    );
  }

  function ResultBadge({ won }: { won: boolean }) {
    return (
      <Badge
        variant="outline"
        className={
          won
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
        }
      >
        {won ? "Win" : "Loss"}
      </Badge>
    );
  }

  function SortHeader({
    label,
    column,
  }: {
    label: string;
    column: SortKey;
  }) {
    const isActive = sortKey === column;
    const icon = !isActive ? (
      <ChevronsUpDown className="h-3.5 w-3.5" />
    ) : sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleSort(column)}
        className="-ml-2 h-8 px-2"
      >
        <span>{label}</span>
        {icon}
      </Button>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="space-y-1">
            <p className="text-sm font-medium">Year</p>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:min-w-[140px]">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Deck</p>
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger className="w-full sm:min-w-[180px]">
                <SelectValue placeholder="All Decks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decks</SelectItem>
                {deckOptions.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id}>
                    <span className="flex items-center gap-2">
                      <ManaSymbols
                        colorIdentity={deck.colorIdentity}
                        size="sm"
                      />
                      <span>
                        {deck.name} - {deck.commanderName}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Result</p>
            <Select
              value={resultFilter}
              onValueChange={(value) =>
                setResultFilter(value as ResultFilter)
              }
            >
              <SelectTrigger className="w-full sm:min-w-[140px]">
                <SelectValue placeholder="All Results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Pod Buddy</p>
            <Select
              value={podBuddyFilter}
              onValueChange={setPodBuddyFilter}
            >
              <SelectTrigger className="w-full sm:min-w-[180px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {podBuddyOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          Showing {sortedGames.length} of {games.length} games
        </p>
      </div>

      <div className="space-y-3 sm:hidden">
        {sortedGames.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border py-8 text-center text-sm">
            No games match your current filters.
          </div>
        ) : (
          sortedGames.map((game) => (
            <div key={game.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{formatDate(game.date)}</p>
                <ResultBadge won={game.won} />
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Deck</p>
                <div className="flex items-center gap-1.5">
                  <ManaSymbols
                    colorIdentity={game.myDeck.commander.colorIdentity}
                    size="sm"
                  />
                  <p className="text-sm font-medium">{game.myDeck.name}</p>
                </div>
                <p className="text-muted-foreground text-xs">{game.myDeck.commander.name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Opponents</p>
                <OpponentsList opponents={game.opponents} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Players</span>
                <span>{game.totalPlayers}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(game)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setGameToDelete(game)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader label="Date" column="date" />
              </TableHead>
              <TableHead>
                <SortHeader label="Deck" column="deck" />
              </TableHead>
              <TableHead>
                <SortHeader label="Opponents" column="opponents" />
              </TableHead>
              <TableHead>
                <SortHeader label="Players" column="players" />
              </TableHead>
              <TableHead>
                <SortHeader label="Result" column="result" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGames.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8"
                >
                  No games match your current filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedGames.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(game.date)}
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{game.myDeck.name}</p>
                      <div className="flex items-center gap-1.5">
                        <ManaSymbols
                          colorIdentity={game.myDeck.commander.colorIdentity}
                          size="sm"
                        />
                        <span className="text-muted-foreground text-xs">
                          {game.myDeck.commander.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <OpponentsList opponents={game.opponents} />
                  </TableCell>

                  <TableCell>{game.totalPlayers}</TableCell>
                  <TableCell>
                    <ResultBadge won={game.won} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Game actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(game)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setGameToDelete(game)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingGame}
        onOpenChange={(open) => {
          if (!open) setEditingGame(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>
              Update the details for this game.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="edit-game-date"
                className="text-sm font-medium"
              >
                Date
              </label>
              <Input
                id="edit-game-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edit-game-deck"
                className="text-sm font-medium"
              >
                My Deck
              </label>
              <Select value={editDeckId} onValueChange={setEditDeckId}>
                <SelectTrigger id="edit-game-deck" className="max-w-sm">
                  <SelectValue placeholder="Select a deck" />
                </SelectTrigger>
                <SelectContent>
                  {editDeckOptions.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      <span className="flex items-center gap-2">
                        <ManaSymbols
                          colorIdentity={deck.colorIdentity}
                          size="sm"
                        />
                        <span>
                          {deck.name} - {deck.commanderName}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opponents</label>
              <div className="space-y-3">
                {editOpponents.map((opp, i) => (
                  <OpponentRow
                    key={i}
                    index={i}
                    entry={opp}
                    canRemove={editOpponents.length > 1}
                    onUpdate={updateEditOpponent}
                    onRemove={removeEditOpponent}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEditOpponent}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Opponent
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editWon}
                onChange={(e) => {
                  setEditWon(e.target.checked);
                  if (e.target.checked) {
                    setEditWinningCommanderName(null);
                    setEditWinningCommanderData(null);
                  }
                }}
                className="accent-primary h-4 w-4 rounded"
              />
              I won this game
            </label>

            {!editWon && (
              <div className="max-w-sm space-y-2">
                <label className="text-sm font-medium">
                  Winning Commander
                </label>
                <CommanderSearch
                  onSelect={handleEditCommanderSelect}
                />
                {fetchingCommander && (
                  <p className="text-muted-foreground text-xs">
                    Loading commander data...
                  </p>
                )}
                {editWinningCommanderData &&
                  editWinningCommanderName && (
                    <div className="flex items-center gap-2 text-sm">
                      <ManaSymbols
                        colorIdentity={
                          editWinningCommanderData.colorIdentity
                        }
                        size="md"
                      />
                      <span>{editWinningCommanderName}</span>
                    </div>
                  )}
                {!editWinningCommanderData &&
                  editWinningCommanderName && (
                    <p className="text-muted-foreground text-xs">
                      Current: {editWinningCommanderName}
                    </p>
                  )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingGame(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!editIsValid}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!gameToDelete}
        onOpenChange={(open) => {
          if (!open) setGameToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {gameToDelete && (
            <div className="text-sm">
              Delete the game on {formatDate(gameToDelete.date)} with{" "}
              <span className="font-medium">
                {gameToDelete.myDeck.name}
              </span>
              ?
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGameToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!gameToDelete) return;
                onDeleteGame(gameToDelete.id);
                setGameToDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
