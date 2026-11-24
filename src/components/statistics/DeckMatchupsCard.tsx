import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import type { DeckMatchup } from "@/lib/stats";

interface DeckMatchupsCardProps {
  data: DeckMatchup[];
}

type SortKey = "commander" | "games" | "wins" | "losses" | "winRate";

const TITLE = "Deck Matchups";
const DESCRIPTION =
  "Your record with each deck against the commanders it has faced";

export function DeckMatchupsCard({ data }: DeckMatchupsCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [sortAsc, setSortAsc] = useState(false);

  // Fall back to the most-played deck (data is sorted by games desc) when
  // nothing is chosen yet or the chosen deck is filtered out.
  const selected = useMemo(
    () =>
      data.find((d) => String(d.deckId) === selectedId) ?? data[0] ?? null,
    [data, selectedId],
  );

  const sorted = useMemo(() => {
    if (!selected) return [];
    const copy = [...selected.opponents];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "commander") {
        cmp = a.commander.localeCompare(b.commander);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [selected, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "commander"); // A-Z default for name, desc for numbers
    }
  }

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground text-sm">No game data yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-0.5 inline-block w-3" />;
    return sortAsc ? (
      <ArrowUp className="ml-0.5 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-0.5 inline h-3 w-3" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLE}</CardTitle>
        <CardDescription>{DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-0 sm:pb-0">
        <div className="mb-3 space-y-1 sm:px-6">
          <Select
            value={String(selected.deckId)}
            onValueChange={setSelectedId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.map((d) => (
                <SelectItem key={d.deckId} value={String(d.deckId)}>
                  {d.deckName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {selected.commanderName && <>{selected.commanderName} · </>}
            {selected.games} {selected.games === 1 ? "game" : "games"} ·{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              {selected.wins}W
            </span>{" "}
            <span className="text-rose-600 dark:text-rose-400">
              {selected.losses}L
            </span>
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground text-sm">
              No opponent commanders recorded for this deck.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1 sm:hidden">
              {(
                [
                  ["Commander", "commander"],
                  ["GP", "games"],
                  ["W", "wins"],
                  ["L", "losses"],
                  ["Win%", "winRate"],
                ] as const
              ).map(([label, key]) => (
                <Button
                  key={key}
                  type="button"
                  variant={sortKey === key ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => toggleSort(key)}
                >
                  {label}
                  {sortKey === key &&
                    (sortAsc ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              ))}
            </div>

            <div className="max-h-[28rem] space-y-2 overflow-y-auto sm:hidden">
              {sorted.map((opp) => (
                <div key={opp.commander} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <p className="text-sm font-medium break-words">
                      {opp.commander}
                    </p>
                    {opp.colorIdentity.length > 0 && (
                      <ManaSymbols colorIdentity={opp.colorIdentity} size="sm" />
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">GP</p>
                      <p className="tabular-nums">{opp.games}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">W</p>
                      <p className="tabular-nums">{opp.wins}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">L</p>
                      <p className="tabular-nums">{opp.losses}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Win%</p>
                      <p className="font-semibold tabular-nums">
                        {opp.winRate}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden max-h-[28rem] overflow-y-auto sm:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      className="w-[52%] cursor-pointer select-none pl-6 text-xs"
                      onClick={() => toggleSort("commander")}
                    >
                      Commander <SortIcon col="commander" />
                    </TableHead>
                    <TableHead
                      className="w-[12%] cursor-pointer select-none text-center text-xs"
                      onClick={() => toggleSort("games")}
                    >
                      GP <SortIcon col="games" />
                    </TableHead>
                    <TableHead
                      className="w-[12%] cursor-pointer select-none text-center text-xs"
                      onClick={() => toggleSort("wins")}
                    >
                      W <SortIcon col="wins" />
                    </TableHead>
                    <TableHead
                      className="w-[12%] cursor-pointer select-none text-center text-xs"
                      onClick={() => toggleSort("losses")}
                    >
                      L <SortIcon col="losses" />
                    </TableHead>
                    <TableHead
                      className="w-[12%] cursor-pointer select-none pr-6 text-right text-xs"
                      onClick={() => toggleSort("winRate")}
                    >
                      Win% <SortIcon col="winRate" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((opp, i) => (
                    <TableRow
                      key={opp.commander}
                      className={i % 2 === 0 ? "bg-muted/30" : ""}
                    >
                      <TableCell className="py-2 pl-6 text-sm font-medium whitespace-normal">
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className="break-words">{opp.commander}</span>
                          {opp.colorIdentity.length > 0 && (
                            <ManaSymbols
                              colorIdentity={opp.colorIdentity}
                              size="sm"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-center text-sm tabular-nums">
                        {opp.games}
                      </TableCell>
                      <TableCell className="py-2 text-center text-sm tabular-nums">
                        {opp.wins}
                      </TableCell>
                      <TableCell className="py-2 text-center text-sm tabular-nums">
                        {opp.losses}
                      </TableCell>
                      <TableCell className="py-2 pr-6 text-right text-sm font-semibold tabular-nums">
                        {opp.winRate}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
