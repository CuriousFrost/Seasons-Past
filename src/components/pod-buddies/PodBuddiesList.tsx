import { useState } from "react";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { CommanderSearch } from "@/components/commanders/CommanderSearch";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getCardByName } from "@/lib/scryfall";
import type { ManaColor, SavedCommander } from "@/types";

interface PodBuddiesListProps {
  podBuddies: string[];
  podBuddyCommanders: Record<string, SavedCommander[]>;
  onAddBuddy: (name: string) => void;
  onRemoveBuddy: (name: string) => void;
  onAddBuddyCommander: (buddy: string, commander: SavedCommander) => Promise<void>;
  onRemoveBuddyCommander: (buddy: string, commanderName: string) => Promise<void>;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function BuddyCard({
  buddy,
  commanders,
  onRemoveBuddy,
  onAddCommander,
  onRemoveCommander,
}: {
  buddy: string;
  commanders: SavedCommander[];
  onRemoveBuddy: () => void;
  onAddCommander: (commander: SavedCommander) => Promise<void>;
  onRemoveCommander: (name: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // Bumped after each add so the search box remounts empty.
  const [searchKey, setSearchKey] = useState(0);

  async function handleSelect(name: string) {
    setSaving(true);
    setLookupError(null);
    try {
      const card = await getCardByName(name);
      if (!card) {
        setLookupError(`Couldn't load "${name}". Try again.`);
        return;
      }
      await onAddCommander({
        name: card.name,
        colorIdentity: card.colorIdentity as ManaColor[],
        imageUrl: card.imageUrl || null,
        artCropUrl: card.artCropUrl || null,
      });
      toast.success(`Added ${card.name} to ${buddy}.`);
      setSearchKey((k) => k + 1);
      setAdding(false);
    } catch {
      // The hook already toasts save failures.
    } finally {
      setSaving(false);
    }
  }

  const count = commanders.length;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="space-y-0">
        <CardTitle className="text-base">{buddy}</CardTitle>
        {/* Commander list lives in a popup so long lists don't crowd the page */}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm disabled:hover:text-muted-foreground"
          onClick={() => setListOpen(true)}
          disabled={count === 0}
        >
          {count === 0
            ? "No commanders saved"
            : `${count} commander${count === 1 ? "" : "s"}`}
          {count > 0 && <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <CardAction className="flex items-center gap-1">
          <Button
            type="button"
            variant={adding ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setAdding((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add a commander for {buddy}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRemoveBuddy}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove {buddy}</span>
          </Button>
        </CardAction>
      </CardHeader>
      {adding && (
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <CommanderSearch key={searchKey} onSelect={(n) => void handleSelect(n)} />
            </div>
            {saving && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
          </div>
          {lookupError && <p className="text-destructive text-xs">{lookupError}</p>}
        </CardContent>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{buddy}'s commanders</DialogTitle>
            <DialogDescription>
              Pick these in one tap when assigning seats in the Life Counter.
            </DialogDescription>
          </DialogHeader>
          {count === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No commanders saved yet.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {commanders.map((cmdr) => {
                const art = cmdr.artCropUrl ?? cmdr.imageUrl;
                return (
                  <li key={cmdr.name} className="flex items-center gap-3 px-3 py-2">
                    {art ? (
                      <img
                        src={art}
                        alt=""
                        className="h-9 w-12 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="bg-muted h-9 w-12 shrink-0 rounded" />
                    )}
                    <span className="min-w-0 flex-1 text-sm leading-tight break-words">
                      {cmdr.name}
                    </span>
                    <ManaSymbols colorIdentity={cmdr.colorIdentity} size="sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => void onRemoveCommander(cmdr.name).catch(() => {})}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">
                        Remove {cmdr.name} from {buddy}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function PodBuddiesList({
  podBuddies,
  podBuddyCommanders,
  onAddBuddy,
  onRemoveBuddy,
  onAddBuddyCommander,
  onRemoveBuddyCommander,
}: PodBuddiesListProps) {
  const [newBuddy, setNewBuddy] = useState("");

  const trimmedBuddy = newBuddy.trim();
  const isDuplicate =
    trimmedBuddy.length > 0 &&
    podBuddies.some(
      (buddy) => normalizeName(buddy) === normalizeName(trimmedBuddy),
    );

  function handleAddBuddy(name?: string) {
    const candidate = (name ?? newBuddy).trim();
    if (!candidate) return;

    const normalized = normalizeName(candidate);
    if (podBuddies.some((buddy) => normalizeName(buddy) === normalized)) {
      setNewBuddy("");
      return;
    }

    onAddBuddy(candidate);
    setNewBuddy("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="relative w-[260px]">
            <Input
              id="add-buddy"
              placeholder="Add a pod buddy..."
              className="h-9"
              autoComplete="off"
              value={newBuddy}
              onChange={(e) => setNewBuddy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddBuddy();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9"
            onClick={() => handleAddBuddy()}
            disabled={trimmedBuddy.length === 0 || isDuplicate}
          >
            Add
          </Button>
        </div>
        {isDuplicate && (
          <p className="text-muted-foreground text-xs">
            That buddy is already in your list.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Total buddies: {podBuddies.length}
      </p>

      {podBuddies.length === 0 ? (
        <div className="text-muted-foreground py-6 text-center text-sm">
          No local buddies yet. Add a few to track your regular pod.
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            Tap + on a buddy to save their commanders. You can then pick them
            in one tap when assigning seats in the Life Counter.
          </p>
          <div className="grid items-start gap-2 sm:grid-cols-2">
            {podBuddies.map((buddy) => (
              <BuddyCard
                key={buddy}
                buddy={buddy}
                commanders={podBuddyCommanders[buddy] ?? []}
                onRemoveBuddy={() => onRemoveBuddy(buddy)}
                onAddCommander={(c) => onAddBuddyCommander(buddy, c)}
                onRemoveCommander={(n) => onRemoveBuddyCommander(buddy, n)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
