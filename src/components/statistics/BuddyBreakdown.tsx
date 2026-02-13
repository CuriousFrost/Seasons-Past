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
import type { BuddyStat } from "@/lib/stats";

interface BuddyBreakdownProps {
  data: BuddyStat[];
}

type SortKey = "buddyName" | "total" | "wins" | "losses" | "winRate";

export function BuddyBreakdown({ data }: BuddyBreakdownProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "buddyName") {
        cmp = a.buddyName.localeCompare(b.buddyName);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "buddyName");
    }
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buddy Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground text-sm">
              Play a game with some buddies!
            </p>
          </div>
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
        <CardTitle>Buddy Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none pl-6 text-xs"
                onClick={() => toggleSort("buddyName")}
              >
                Buddy <SortIcon col="buddyName" />
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
            {sorted.map((buddy, i) => (
              <TableRow
                key={buddy.buddyName}
                className={i % 2 === 0 ? "bg-muted/30" : ""}
              >
                <TableCell className="pl-6 py-2 text-sm font-medium truncate max-w-[160px]">
                  {buddy.buddyName}
                </TableCell>
                <TableCell className="text-center py-2 text-sm tabular-nums">
                  {buddy.total}
                </TableCell>
                <TableCell className="text-center py-2 text-sm tabular-nums">
                  {buddy.wins}
                </TableCell>
                <TableCell className="text-center py-2 text-sm tabular-nums">
                  {buddy.losses}
                </TableCell>
                <TableCell className="text-right pr-6 py-2 text-sm font-semibold tabular-nums">
                  {buddy.winRate.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
