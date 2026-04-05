import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ManaSymbols } from "./ManaSymbols";
import { useCardImage } from "@/hooks/use-card-image";
import type { Deck, Game } from "@/types";

interface DeckCardProps {
  deck: Deck;
  games: Game[];
  onToggleArchive: (deckId: number) => void;
  onDelete: (deck: Deck) => void;
  onImportDecklist: (deck: Deck) => void;
  onRename: (deckId: number, name: string) => void;
}

function buildEdhrecUrl(commanderName: string): string {
  const slug = commanderName
    .toLowerCase()
    .replace(/[,']/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `https://edhrec.com/commanders/${slug}`;
}

export function DeckCard({ deck, games, onToggleArchive, onDelete, onImportDecklist, onRename }: DeckCardProps) {
  const isArchived = !!deck.archived;
  const imageUrl = useCardImage(deck.commander.name);
  const deckGames = games.filter((g) => g.myDeck.id === deck.id);
  const wins = deckGames.filter((g) => g.won).length;
  const losses = deckGames.length - wins;
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(deck.name);

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-xl ${
        isArchived ? "opacity-60" : ""
      }`}
    >
      {/* Full-bleed art */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={deck.commander.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/* Gradient overlays — top for deck info, bottom for buttons */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent via-45% to-black/60" />

      {/* Deck info — top left */}
      <div className="absolute top-0 left-0 right-0 p-3">
        <div className="flex items-start gap-1">
          <h3 className="flex-1 text-base font-bold text-white drop-shadow-lg leading-tight">
            {deck.name}
          </h3>
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded p-0.5 text-white/60 hover:bg-white/20 hover:text-white"
            onClick={() => { setRenameValue(deck.name); setRenameOpen(true); }}
            aria-label="Rename deck"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        <p className="text-white/80 text-xs drop-shadow-md mt-0.5 truncate">
          {deck.commander.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <ManaSymbols colorIdentity={deck.commander.colorIdentity} size="sm" />
          {deckGames.length > 0 && (
            <Badge className="text-xs bg-black/50 text-white border-0 font-mono">
              {wins}W–{losses}L
            </Badge>
          )}
        </div>
      </div>

      {/* Top-right badges */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        {isArchived && (
          <Badge variant="secondary" className="text-xs bg-black/40 text-white border-0">
            Retired
          </Badge>
        )}
      </div>

      {/* Action buttons — bottom, two rows like the old app */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className="rounded-md bg-white/15 px-2 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
            onClick={() => onImportDecklist(deck)}
          >
            Decklist
          </button>
          <button
            type="button"
            className="rounded-md bg-white/15 px-2 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
            onClick={() => window.open(buildEdhrecUrl(deck.commander.name), "_blank")}
          >
            EDHREC
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className="rounded-md bg-white/15 px-2 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors flex items-center justify-center gap-1"
            onClick={() => onToggleArchive(deck.id)}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-3 w-3" />
                Restore
              </>
            ) : (
              <>
                <Archive className="h-3 w-3" />
                Retire
              </>
            )}
          </button>
          <button
            type="button"
            className="rounded-md bg-rose-500/25 px-2 py-1.5 text-xs font-medium text-rose-200 backdrop-blur-sm hover:bg-rose-500/40 transition-colors flex items-center justify-center gap-1"
            onClick={() => onDelete(deck)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Deck</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim()) {
                onRename(deck.id, renameValue.trim());
                setRenameOpen(false);
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim() || renameValue.trim() === deck.name}
              onClick={() => { onRename(deck.id, renameValue.trim()); setRenameOpen(false); }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
