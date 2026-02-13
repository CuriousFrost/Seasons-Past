import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ManaSymbols } from "./ManaSymbols";
import { useCardImage } from "@/hooks/use-card-image";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onToggleArchive: (deckId: number) => void;
  onDelete: (deck: Deck) => void;
  onImportDecklist: (deck: Deck) => void;
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

export function DeckCard({ deck, onToggleArchive, onDelete, onImportDecklist }: DeckCardProps) {
  const isArchived = !!deck.archived;
  const imageUrl = useCardImage(deck.commander.name);

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
        <h3 className="text-base font-bold text-white drop-shadow-lg leading-tight">
          {deck.name}
        </h3>
        <p className="text-white/80 text-xs drop-shadow-md mt-0.5 truncate">
          {deck.commander.name}
        </p>
        <div className="mt-1">
          <ManaSymbols colorIdentity={deck.commander.colorIdentity} size="sm" />
        </div>
      </div>

      {/* Archived badge */}
      {isArchived && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs bg-black/40 text-white border-0">
            Retired
          </Badge>
        </div>
      )}

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
    </div>
  );
}
