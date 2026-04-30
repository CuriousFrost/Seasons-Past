import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import { searchCommanderNames, fetchCommanderByName } from "@/lib/scryfall";
import { CommanderCameraScanner } from "./CommanderCameraScanner";
import type { ManaColor } from "@/types";

export interface OpponentEntry {
  id: string;
  name: string;
  commanderName: string;
  commanderColorIdentity: ManaColor[];
}

export function emptyOpponentEntry(): OpponentEntry {
  return { id: crypto.randomUUID(), name: "", commanderName: "", commanderColorIdentity: [] };
}

interface OpponentRowProps {
  index: number;
  entry: OpponentEntry;
  onUpdate: (index: number, entry: OpponentEntry) => void;
  onRemove: (index: number) => void;
}

export function OpponentRow({
  index,
  entry,
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

  // ── Card scanning ───────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

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

  async function handleCardScanned(cardName: string) {
    setScanError(null);
    const data = await fetchCommanderByName(cardName);
    if (!data) {
      setScanError(`"${cardName}" is not a recognised commander`);
      return;
    }
    setCmdQuery(data.name);
    onUpdate(index, {
      ...entry,
      commanderName: data.name,
      commanderColorIdentity: data.colorIdentity,
    });
  }

  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        {/* Name input */}
        <Input
          placeholder={`Opponent ${index + 1}`}
          value={entry.name}
          onChange={(e) => onUpdate(index, { ...entry, name: e.target.value })}
        />

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
              placeholder="Commander (optional)"
              value={cmdQuery}
              onChange={(e) => handleCmdChange(e.target.value)}
              onKeyDown={handleCmdKeyDown}
              onFocus={() => cmdResults.length > 0 && setCmdOpen(true)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan card with camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <CommanderCameraScanner
              open={scannerOpen}
              onOpenChange={setScannerOpen}
              onCardScanned={(name) => void handleCardScanned(name)}
            />
          </div>
          {scanError && (
            <p className="text-destructive mt-1 text-xs">{scanError}</p>
          )}
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

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
