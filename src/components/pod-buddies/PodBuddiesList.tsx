import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PodBuddiesListProps {
  podBuddies: string[];
  onAddBuddy: (name: string) => void;
  onRemoveBuddy: (name: string) => void;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function PodBuddiesList({
  podBuddies,
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
