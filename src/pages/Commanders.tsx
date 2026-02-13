import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecks } from "@/hooks/use-decks";
import { AddDeckDialog } from "@/components/commanders/AddDeckDialog";
import { DeckCard } from "@/components/commanders/DeckCard";
import { DeleteDeckDialog } from "@/components/commanders/DeleteDeckDialog";
import { OrganizeLibraryDialog } from "@/components/commanders/OrganizeLibraryDialog";
import { DecklistImport } from "@/components/DecklistImport";
import type { Commander, Deck, Decklist } from "@/types";

export default function Commanders() {
  const { decks, loading, error, addDeck, toggleArchive, deleteDeck, updateDecklist, updateDeckOrder } =
    useDecks();
  const [showArchived, setShowArchived] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [deckToImport, setDeckToImport] = useState<Deck | null>(null);
  const [organizeOpen, setOrganizeOpen] = useState(false);

  const visibleDecks = showArchived
    ? decks
    : decks.filter((d) => !d.archived);

  function handleAdd(name: string, commander: Commander) {
    addDeck(name, commander);
  }

  function handleImportDecklist(decklist: Decklist) {
    if (!deckToImport) return;
    updateDecklist(deckToImport.id, decklist);
    setDeckToImport(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Commanders</h1>
          <p className="text-muted-foreground mt-1">
            Manage your commander decks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {decks.length > 1 && (
            <Button variant="outline" onClick={() => setOrganizeOpen(true)}>
              <ListOrdered className="mr-1 h-4 w-4" />
              Organize
            </Button>
          )}
          <AddDeckDialog onAdd={handleAdd} />
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {decks.some((d) => d.archived) && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-primary h-4 w-4 rounded"
          />
          Show retired decks
        </label>
      )}

      {loading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : visibleDecks.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          {decks.length === 0
            ? "No decks yet. Add your first deck to get started!"
            : "No active decks. Toggle \"Show retired decks\" to see archived decks."}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visibleDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onToggleArchive={toggleArchive}
              onDelete={setDeckToDelete}
              onImportDecklist={setDeckToImport}
            />
          ))}
        </div>
      )}

      <DeleteDeckDialog
        deck={deckToDelete}
        onConfirm={deleteDeck}
        onClose={() => setDeckToDelete(null)}
      />

      <DecklistImport
        open={!!deckToImport}
        onClose={() => setDeckToImport(null)}
        onImport={handleImportDecklist}
      />

      <OrganizeLibraryDialog
        open={organizeOpen}
        onClose={() => setOrganizeOpen(false)}
        decks={decks}
        onSave={updateDeckOrder}
      />
    </div>
  );
}
