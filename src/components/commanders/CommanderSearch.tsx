import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchCommanderNames } from "@/lib/scryfall";

interface CommanderSearchProps {
  onSelect: (name: string) => void;
}

export function CommanderSearch({ onSelect }: CommanderSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const names = await searchCommanderNames(q);
      setResults(names);
      setOpen(names.length > 0);
      setActiveIndex(-1);
    }, 200);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  function handleSelect(name: string) {
    setQuery(name);
    setOpen(false);
    setResults([]);
    onSelect(name);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search for a commander..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="bg-popover border-border absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md">
          {results.map((name, i) => (
            <li
              key={name}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={() => handleSelect(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
