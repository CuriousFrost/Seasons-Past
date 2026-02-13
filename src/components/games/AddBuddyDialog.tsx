import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddBuddyDialogProps {
  open: boolean;
  onClose: () => void;
  podBuddies: string[];
  onlineFriends: string[];
  onSelect: (name: string) => void;
}

function BuddyList({
  names,
  emptyMessage,
  onSelect,
}: {
  names: string[];
  emptyMessage: string;
  onSelect: (name: string) => void;
}) {
  if (names.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="max-h-60 space-y-1 overflow-y-auto">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm"
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export function AddBuddyDialog({
  open,
  onClose,
  podBuddies,
  onlineFriends,
  onSelect,
}: AddBuddyDialogProps) {
  function handleSelect(name: string) {
    onSelect(name);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Buddy</DialogTitle>
          <DialogDescription>
            Select a buddy to add as an opponent.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="local">
          <TabsList className="w-full">
            <TabsTrigger value="local" className="flex-1">
              Local Buddies
            </TabsTrigger>
            <TabsTrigger value="online" className="flex-1">
              Online Friends
            </TabsTrigger>
          </TabsList>
          <TabsContent value="local">
            <BuddyList
              names={podBuddies}
              emptyMessage="No local buddies yet. Add some on the Pod Buddies page."
              onSelect={handleSelect}
            />
          </TabsContent>
          <TabsContent value="online">
            <BuddyList
              names={onlineFriends}
              emptyMessage="No online friends yet. Add some on the Pod Buddies page."
              onSelect={handleSelect}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
