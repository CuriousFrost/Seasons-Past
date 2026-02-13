import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import { searchCommanderNames, fetchCommanderByName } from "@/lib/scryfall";
import type { ManaColor } from "@/types";

export interface OpponentEntry {
  name: string;
  commanderName: string;
  commanderColorIdentity: ManaColor[];
}

export function emptyOpponentEntry(): OpponentEntry {
  return { name: "", commanderName: "", commanderColorIdentity: [] };
}

interface OpponentRowProps {
  index: number;
  entry: OpponentEntry;
  canRemove: boolean;
  onUpdate: (index: number, entry: OpponentEntry) => void;
  onRemove: (index: number) => void;
}

export function OpponentRow({
  index,
  entry,
  canRemove,
  onUpdate,
  onRemove,
}: OpponentRowProps) {
  // ── Commander search ───────────────────────────────────
  const [cmdQuery, setCmdQuery] = useState(entry.commanderName);
  const [cmdResults, setCmdResults] = useState<string[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdActiveIndex, setCmdActiveIndex] = useState(-1);
  const cmdRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setCmdQuery(entry.commanderName);
  }, [entry.commanderName]);

  const searchCmd = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setCmdResults([]);
      setCmdOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const names = await searchCommanderNames(q);
      setCmdResults(names);
      setCmdOpen(names.length > 0);
      setCmdActiveIndex(-1);
    }, 250);
  }, []);

  // ── Click outside ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cmdRef.current && !cmdRef.current.contains(e.target as Node)) {
        setCmdOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ───────────────────────────────────────────
  function handleCmdChange(value: string) {
    setCmdQuery(value);
    if (!value.trim()) {
      onUpdate(index, {
        ...entry,
        commanderName: "",
        commanderColorIdentity: [],
      });
      setCmdResults([]);
      setCmdOpen(false);
    } else {
      searchCmd(value);
    }
  }

  async function handleCmdSelect(name: string) {
    setCmdQuery(name);
    setCmdOpen(false);
    setCmdResults([]);
    const data = await fetchCommanderByName(name);
    onUpdate(index, {
      ...entry,
      commanderName: name,
      commanderColorIdentity: data?.colorIdentity ?? [],
    });
  }

  function handleCmdKeyDown(e: React.KeyboardEvent) {
    if (!cmdOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdActiveIndex((i) => Math.min(i + 1, cmdResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && cmdActiveIndex >= 0) {
      e.preventDefault();
      handleCmdSelect(cmdResults[cmdActiveIndex]);
    } else if (e.key === "Escape") {
      setCmdOpen(false);
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-2 sm:grid-cols-[auto_1fr]">
        {/* Name label */}
        <div className="flex min-h-9 items-center gap-1 rounded-md border px-3 text-sm">
          {entry.name ? (
            <>
              <span className="font-medium">{entry.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground ml-1"
                onClick={() => onUpdate(index, { ...entry, name: "" })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="text-muted-foreground">
              Opponent {index + 1}
            </span>
          )}
        </div>

        {/* Commander search */}
        <div ref={cmdRef} className="relative">
          <div className="flex items-center gap-1.5">
            {entry.commanderColorIdentity.length > 0 && (
              <ManaSymbols
                colorIdentity={entry.commanderColorIdentity}
                size="sm"
              />
            )}
            <Input
              placeholder="Commander"
              value={cmdQuery}
              onChange={(e) => handleCmdChange(e.target.value)}
              onKeyDown={handleCmdKeyDown}
              onFocus={() => cmdResults.length > 0 && setCmdOpen(true)}
              className="flex-1"
            />
          </div>
          {cmdOpen && (
            <ul className="bg-popover border-border absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border shadow-md">
              {cmdResults.map((name, i) => (
                <li
                  key={name}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    i === cmdActiveIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onMouseEnter={() => setCmdActiveIndex(i)}
                  onMouseDown={() => handleCmdSelect(name)}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
