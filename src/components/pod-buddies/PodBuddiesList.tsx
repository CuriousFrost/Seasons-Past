import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PodBuddiesListProps {
  podBuddies: string[];
  knownOpponents: string[];
  onAddBuddy: (name: string) => void;
  onRemoveBuddy: (name: string) => void;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function PodBuddiesList({
  podBuddies,
  knownOpponents,
  onAddBuddy,
  onRemoveBuddy,
}: PodBuddiesListProps) {
  const [newBuddy, setNewBuddy] = useState("");

  const trimmedBuddy = newBuddy.trim();
  const isDuplicate =
    trimmedBuddy.length > 0 &&
    podBuddies.some(
      (buddy) => normalizeName(buddy) === normalizeName(trimmedBuddy),
    );

  const suggestions = useMemo(() => {
    const query = normalizeName(newBuddy);
    if (!query) return [];

    const existing = new Set(podBuddies.map(normalizeName));
    const seen = new Set<string>();

    return knownOpponents
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (existing.has(key) || seen.has(key)) return false;
        if (!key.includes(query)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6);
  }, [knownOpponents, newBuddy, podBuddies]);

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
              value={newBuddy}
              onChange={(e) => setNewBuddy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddBuddy();
                }
              }}
            />
            {suggestions.length > 0 && (
              <div className="bg-popover border-border absolute z-50 mt-1 w-full rounded-md border shadow-md">
                <ul className="max-h-52 overflow-auto py-1">
                  {suggestions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="hover:bg-accent/50 w-full px-3 py-1.5 text-left text-sm"
                        onClick={() => handleAddBuddy(name)}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
        <div className="grid gap-2 sm:grid-cols-2">
          {podBuddies.map((buddy) => (
            <Card key={buddy} className="gap-3 py-4">
              <CardHeader className="space-y-0">
                <CardTitle className="text-base">{buddy}</CardTitle>
                <CardAction>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveBuddy(buddy)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {buddy}</span>
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
