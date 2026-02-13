import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManaSymbols } from "./ManaSymbols";
import type { Deck } from "@/types";

interface OrganizeLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  decks: Deck[];
  onSave: (orderedDecks: Deck[]) => void;
}

function SortableDeckItem({ deck }: { deck: Deck }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-md border bg-card p-3 ${
        isDragging ? "z-50 shadow-lg opacity-90" : ""
      }`}
    >
      <button
        className="touch-none cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ManaSymbols colorIdentity={deck.commander.colorIdentity} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{deck.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {deck.commander.name}
        </p>
      </div>
      {deck.archived && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Retired
        </Badge>
      )}
    </div>
  );
}

export function OrganizeLibraryDialog({
  open,
  onClose,
  decks,
  onSave,
}: OrganizeLibraryDialogProps) {
  const [orderedDecks, setOrderedDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (open) setOrderedDecks([...decks]);
  }, [open, decks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedDecks((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === active.id);
      const newIndex = prev.findIndex((d) => d.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSave() {
    onSave(orderedDecks);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Organize Library</DialogTitle>
          <DialogDescription>
            Drag to reorder your decks.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedDecks.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedDecks.map((deck) => (
                <SortableDeckItem key={deck.id} deck={deck} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
