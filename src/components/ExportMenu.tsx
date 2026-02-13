import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Deck, Game } from "@/types";

type ExportMenuProps = {
  games: Game[];
  decks: Deck[];
  podBuddies: string[];
};

function getDateStamp() {
  return new Date().toLocaleDateString("en-CA");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function gamesToCsv(games: Game[]) {
  const headers = [
    "Date",
    "Deck Name",
    "Commander",
    "Won",
    "Opponents",
    "Total Players",
  ];

  const rows = games.map((game) => {
    const opponents = game.opponents.map((opponent) => opponent.name).join(";");
    return [
      game.date,
      game.myDeck.name,
      game.myDeck.commander.name,
      String(game.won),
      opponents,
      String(game.totalPlayers),
    ].map(escapeCsv).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function ExportMenu({ games, decks, podBuddies }: ExportMenuProps) {
  function exportGamesCsv() {
    const csv = gamesToCsv(games);
    const filename = `mtg-tracker-games-${getDateStamp()}.csv`;
    downloadFile(filename, csv, "text/csv;charset=utf-8");
  }

  function exportGamesJson() {
    const payload = JSON.stringify(games, null, 2);
    const filename = `mtg-tracker-games-${getDateStamp()}.json`;
    downloadFile(filename, payload, "application/json;charset=utf-8");
  }

  function exportDecksJson() {
    const payload = JSON.stringify(decks, null, 2);
    const filename = `mtg-tracker-decks-${getDateStamp()}.json`;
    downloadFile(filename, payload, "application/json;charset=utf-8");
  }

  function exportAllJson() {
    const payload = JSON.stringify({ games, decks, podBuddies }, null, 2);
    const filename = `mtg-tracker-all-${getDateStamp()}.json`;
    downloadFile(filename, payload, "application/json;charset=utf-8");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={exportGamesCsv}>Export Games as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportGamesJson}>Export Games as JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={exportDecksJson}>Export Decks as JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={exportAllJson}>Export All Data as JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
