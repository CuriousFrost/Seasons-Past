import { useState, useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeckStat } from "@/lib/stats";

interface DeckWinRateChartProps {
  data: DeckStat[];
}

type SortKey = "deckName" | "total" | "wins" | "losses" | "winRate";

export function DeckWinRateChart({ data }: DeckWinRateChartProps) {
  const [sortKey, setSortKey] = useState<SortKey>("winRate");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const active = data.filter((d) => d.total > 0);
    const zero = data.filter((d) => d.total === 0);

    active.sort((a, b) => {
      let cmp: number;
      if (sortKey === "deckName") {
        cmp = a.deckName.localeCompare(b.deckName);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortAsc ? cmp : -cmp;
    });

    return [...active, ...zero];
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "deckName"); // A-Z default for name, desc for numbers
    }
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win Rate by Deck</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No game data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <span className="ml-0.5 inline-block w-3" />;
    return sortAsc ? (
      <ArrowUp className="ml-0.5 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-0.5 inline h-3 w-3" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win Rate by Deck</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none pl-6 text-xs"
                onClick={() => toggleSort("deckName")}
              >
                Deck <SortIcon col="deckName" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-center text-xs w-12"
                onClick={() => toggleSort("total")}
              >
                GP <SortIcon col="total" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-center text-xs w-12"
                onClick={() => toggleSort("wins")}
              >
                W <SortIcon col="wins" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-center text-xs w-12"
                onClick={() => toggleSort("losses")}
              >
                L <SortIcon col="losses" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right text-xs pr-6 w-16"
                onClick={() => toggleSort("winRate")}
              >
                Win% <SortIcon col="winRate" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((deck, i) => {
              const isZero = deck.total === 0;
              return (
                <TableRow
                  key={deck.deckName}
                  className={`${
                    i % 2 === 0 ? "bg-muted/30" : ""
                  } ${isZero ? "opacity-40" : ""}`}
                >
                  <TableCell className="pl-6 py-2 text-sm font-medium truncate max-w-[160px]">
                    {deck.deckName}
                  </TableCell>
                  <TableCell className="text-center py-2 text-sm tabular-nums">
                    {deck.total}
                  </TableCell>
                  <TableCell className="text-center py-2 text-sm tabular-nums">
                    {deck.wins}
                  </TableCell>
                  <TableCell className="text-center py-2 text-sm tabular-nums">
                    {deck.losses}
                  </TableCell>
                  <TableCell className="text-right pr-6 py-2 text-sm font-semibold tabular-nums">
                    {deck.winRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
