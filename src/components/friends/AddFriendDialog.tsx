import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AddFriendDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (friendId: string) => Promise<void>;
}

export function AddFriendDialog({
  open,
  onClose,
  onSend,
}: AddFriendDialogProps) {
  const [friendId, setFriendId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFriendId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = friendId.trim();
    if (trimmed.length !== 8) {
      setError("Friend ID must be 8 characters");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setFriendId("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send friend request",
      );
    } finally {
      setSending(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setFriendId("");
      setError(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Enter your friend's 8-character Friend ID to send a request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="e.g. A3K9M2X7"
              value={friendId}
              onChange={handleChange}
              maxLength={8}
              className="font-mono text-center text-lg tracking-widest"
            />
            <p className="text-muted-foreground text-xs text-center">
              {friendId.length}/8 characters
            </p>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={friendId.length !== 8 || sending}
            >
              {sending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
