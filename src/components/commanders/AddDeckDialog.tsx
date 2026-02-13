import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CommanderSearch } from "./CommanderSearch";
import { ManaSymbols } from "./ManaSymbols";
import { fetchCommanderByName } from "@/lib/scryfall";
import type { Commander } from "@/types";

interface AddDeckDialogProps {
  onAdd: (name: string, commander: Commander) => void;
}

export function AddDeckDialog({ onAdd }: AddDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [commander, setCommander] = useState<Commander | null>(null);
  const [deckName, setDeckName] = useState("");
  const [loadingCommander, setLoadingCommander] = useState(false);

  async function handleCommanderSelect(name: string) {
    setLoadingCommander(true);
    const data = await fetchCommanderByName(name);
    setLoadingCommander(false);

    if (data) {
      setCommander(data);
      if (!deckName) setDeckName(data.name);
    }
  }

  function handleSave() {
    if (!commander || !deckName.trim()) return;
    onAdd(deckName.trim(), commander);
    handleClose();
  }

  function handleClose() {
    setOpen(false);
    setCommander(null);
    setDeckName("");
    setLoadingCommander(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Deck
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Deck</DialogTitle>
          <DialogDescription>
            Search for your commander, then name your deck.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Commander</label>
            <CommanderSearch onSelect={handleCommanderSelect} />
            {loadingCommander && (
              <p className="text-muted-foreground text-sm">
                Loading commander...
              </p>
            )}
            {commander && (
              <div className="bg-muted flex items-center gap-3 rounded-md p-3">
                <ManaSymbols colorIdentity={commander.colorIdentity} />
                <div>
                  <p className="text-sm font-medium">{commander.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {commander.type}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deck Name</label>
            <Input
              placeholder="e.g. Atraxa Superfriends"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!commander || !deckName.trim()}
          >
            Save Deck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
