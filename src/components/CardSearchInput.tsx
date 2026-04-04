import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  debounce,
  searchCards,
  type DebouncedFunction,
  type ScryfallCard,
} from "@/lib/scryfall";
import { cn } from "@/lib/utils";

interface CardSearchInputProps {
  onCardSelect: (card: ScryfallCard) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function parseManaCost(manaCost: string): string[] {
  return Array.from(manaCost.matchAll(/\{([^}]+)\}/g), (match) => match[1]);
}

function getManaTokenClasses(token: string): string {
  const upper = token.toUpperCase();

  if (upper === "W") {
    return "border-zinc-300 bg-amber-50 text-zinc-800";
  }
  if (upper === "U") {
    return "border-sky-300 bg-sky-100 text-sky-900";
  }
  if (upper === "B") {
    return "border-zinc-500 bg-zinc-700 text-zinc-50";
  }
  if (upper === "R") {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }
  if (upper === "G") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }
  if (upper.includes("/")) {
    return "border-violet-300 bg-violet-100 text-violet-900";
  }
  return "border-border bg-muted text-foreground";
}

function ManaCost({ manaCost }: { manaCost: string }) {
  const tokens = parseManaCost(manaCost);

  if (tokens.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {tokens.map((token, index) => (
        <span
          key={`${token}-${index}`}
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-semibold leading-none shadow-sm",
            getManaTokenClasses(token),
            token.length > 2 && "rounded-md px-1.5",
          )}
        >
          {token}
        </span>
      ))}
    </div>
  );
}

function CardResultRow({
  id,
  card,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  card: ScryfallCard;
  active: boolean;
  onHover: () => void;
  onSelect: (card: ScryfallCard) => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={cn(
        "cursor-pointer px-3 py-2",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
      onMouseEnter={onHover}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect(card);
      }}
    >
      <div className="flex items-center gap-3">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-14 w-10 shrink-0 rounded-sm object-cover"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-14 w-10 shrink-0 items-center justify-center rounded-sm text-[10px]">
            N/A
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{card.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {card.setName}
              </p>
            </div>
            <ManaCost manaCost={card.manaCost} />
          </div>
        </div>
      </div>
    </li>
  );
}

export default function CardSearchInput({
  onCardSelect,
  placeholder = "Search for a card...",
  autoFocus = false,
}: CardSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const debouncedSearchRef = useRef<DebouncedFunction<[string]> | null>(null);
  const listboxId = useId();

  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce((nextQuery: string) => {
      const requestId = ++requestIdRef.current;

      void (async () => {
        const cards = await searchCards(nextQuery);
        if (requestId !== requestIdRef.current) return;

        setResults(cards);
        setActiveIndex(cards.length > 0 ? 0 : -1);
        setLoading(false);
        setOpen(true);
      })();
    });
  }

  useEffect(() => {
    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(card: ScryfallCard) {
    onCardSelect(card);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setLoading(false);
    setOpen(false);
    requestIdRef.current++;
    debouncedSearchRef.current?.cancel();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    const trimmed = nextQuery.trim();
    debouncedSearchRef.current?.cancel();
    requestIdRef.current++;

    if (trimmed.length < 2) {
      setResults([]);
      setActiveIndex(-1);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    debouncedSearchRef.current?.(trimmed);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        handleSelect(results[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim().length >= 2) {
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          showDropdown && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
      />

      {showDropdown && (
        <div className="bg-popover border-border absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border shadow-md">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching cards...
            </div>
          ) : results.length === 0 ? (
            <div className="text-muted-foreground px-3 py-3 text-sm">
              No results found
            </div>
          ) : (
            <ul id={listboxId} role="listbox">
              {results.map((card, index) => (
                <CardResultRow
                  key={`${card.name}-${card.setName}`}
                  id={`${listboxId}-${index}`}
                  card={card}
                  active={index === activeIndex}
                  onHover={() => setActiveIndex(index)}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
