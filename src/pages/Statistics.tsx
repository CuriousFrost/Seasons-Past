import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import {
  computeOverviewStats,
  computeDeckStats,
  computeMonthlyStats,
  computeColorStats,
  computeMostFacedCommanders,
  computeBuddyStats,
} from "@/lib/stats";
import { OverviewCards } from "@/components/statistics/OverviewCards";
import { DeckWinRateChart } from "@/components/statistics/DeckWinRateChart";
import { GamesOverTimeChart } from "@/components/statistics/GamesOverTimeChart";
import { ColorBreakdownChart } from "@/components/statistics/ColorBreakdownChart";
import { BuddyBreakdown } from "@/components/statistics/BuddyBreakdown";
import { MostFacedCommanders } from "@/components/statistics/MostFacedCommanders";

const ALL_TIME = "all";
const ALL_BUDDIES = "all";

export default function Statistics() {
  const { decks, loading: decksLoading, error: decksError } = useDecks();
  const { games, loading: gamesLoading, error: gamesError } = useGames();
  const { podBuddies } = usePodBuddies();

  const [yearFilter, setYearFilter] = useState(ALL_TIME);
  const [buddyFilter, setBuddyFilter] = useState(ALL_BUDDIES);
  const [commanderFilter, setCommanderFilter] = useState("");
  const [commanderSearch, setCommanderSearch] = useState("");
  const [showCommanderDropdown, setShowCommanderDropdown] = useState(false);
  const commanderInputRef = useRef<HTMLInputElement>(null);
  const commanderDropdownRef = useRef<HTMLDivElement>(null);

  const loading = decksLoading || gamesLoading;
  const error = decksError || gamesError;

  // Available years from game data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const g of games) {
      years.add(g.date.slice(0, 4));
    }
    return Array.from(years).sort().reverse();
  }, [games]);

  // All opponent player names appearing in games (for buddy filter)
  const opponentNames = useMemo(() => {
    const names = new Set<string>();
    for (const g of games) {
      for (const opp of g.opponents) {
        if (opp.name?.trim()) names.add(opp.name.trim());
      }
    }
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [games]);

  // All opponent commander names appearing in games (for vs. Commander filter)
  const allCommanderNames = useMemo(() => {
    const names = new Set<string>();
    for (const g of games) {
      for (const opp of g.opponents) {
        const cmd = opp.commander ?? opp.name;
        if (cmd?.trim()) names.add(cmd.trim());
      }
      if (g.winningCommander?.trim()) names.add(g.winningCommander.trim());
    }
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [games]);

  // Commander autocomplete suggestions
  const commanderSuggestions = useMemo(() => {
    const query = commanderSearch.toLowerCase().trim();
    if (!query) return allCommanderNames.slice(0, 8);
    return allCommanderNames
      .filter((n) => n.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allCommanderNames, commanderSearch]);

  // Close commander dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        commanderDropdownRef.current &&
        !commanderDropdownRef.current.contains(e.target as Node) &&
        commanderInputRef.current &&
        !commanderInputRef.current.contains(e.target as Node)
      ) {
        setShowCommanderDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered games
  const filteredGames = useMemo(() => {
    let result = games;

    if (yearFilter !== ALL_TIME) {
      result = result.filter((g) => g.date.startsWith(yearFilter));
    }

    if (buddyFilter !== ALL_BUDDIES) {
      result = result.filter((g) =>
        g.opponents.some((opp) => opp.name === buddyFilter),
      );
    }

    if (commanderFilter) {
      const cf = commanderFilter.toLowerCase();
      result = result.filter((g) => {
        for (const opp of g.opponents) {
          const cmd = (opp.commander ?? opp.name)?.toLowerCase();
          if (cmd === cf) return true;
        }
        if (g.winningCommander?.toLowerCase() === cf) return true;
        return false;
      });
    }

    return result;
  }, [games, yearFilter, buddyFilter, commanderFilter]);

  const overview = computeOverviewStats(filteredGames, decks);
  const deckStats = computeDeckStats(filteredGames);
  const monthlyStats = computeMonthlyStats(filteredGames);
  const colorStats = computeColorStats(filteredGames);
  const facedCommanders = computeMostFacedCommanders(filteredGames);
  const buddyStats = computeBuddyStats(filteredGames);

  const filterParts: string[] = [];
  if (yearFilter !== ALL_TIME) filterParts.push(yearFilter);
  if (buddyFilter !== ALL_BUDDIES) filterParts.push(`vs. ${buddyFilter}`);
  if (commanderFilter) filterParts.push(`vs. ${commanderFilter}`);
  const filterLabel =
    filterParts.length > 0 ? filterParts.join(" · ") + " Stats" : null;

  function selectCommander(name: string) {
    setCommanderFilter(name);
    setCommanderSearch("");
    setShowCommanderDropdown(false);
  }

  function clearCommanderFilter() {
    setCommanderFilter("");
    setCommanderSearch("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground mt-1">
            {filterLabel ?? "Charts and analytics for your play history."}
          </p>
        </div>

        {games.length > 0 && (
          <div className="grid w-full grid-cols-1 items-end gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {/* Year filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TIME}>Lifetime</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Buddy filter */}
            <Select value={buddyFilter} onValueChange={setBuddyFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BUDDIES}>All Buddies</SelectItem>
                {podBuddies.length > 0 && (
                  <>
                    {podBuddies
                      .filter((b) => opponentNames.includes(b))
                      .map((b) => (
                        <SelectItem key={`buddy-${b}`} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                  </>
                )}
                {opponentNames
                  .filter((n) => !podBuddies.includes(n))
                  .map((n) => (
                    <SelectItem key={`opp-${n}`} value={n}>
                      {n}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* vs. Commander filter — autocomplete search */}
            <div className="relative w-full sm:w-auto">
              {commanderFilter ? (
                <div className="flex items-center gap-1 h-9 px-2 rounded-md border bg-background text-sm">
                  <span className="truncate max-w-full sm:max-w-[140px]">
                    vs. {commanderFilter}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={clearCommanderFilter}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Input
                  ref={commanderInputRef}
                  placeholder="vs. Commander..."
                  className="h-9 w-full sm:w-[170px]"
                  value={commanderSearch}
                  onChange={(e) => {
                    setCommanderSearch(e.target.value);
                    setShowCommanderDropdown(true);
                  }}
                  onFocus={() => setShowCommanderDropdown(true)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      commanderSuggestions.length > 0
                    ) {
                      e.preventDefault();
                      selectCommander(commanderSuggestions[0]);
                    }
                    if (e.key === "Escape") {
                      setShowCommanderDropdown(false);
                    }
                  }}
                />
              )}
              {showCommanderDropdown &&
                !commanderFilter &&
                commanderSuggestions.length > 0 && (
                  <div
                    ref={commanderDropdownRef}
                    className="absolute right-0 z-50 mt-1 w-full rounded-md border bg-popover shadow-md sm:w-[240px]"
                  >
                    <ul className="max-h-52 overflow-auto py-1">
                      {commanderSuggestions.map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent/50 truncate"
                            onClick={() => selectCommander(name)}
                          >
                            {name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : games.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No games logged yet.</p>
          <p className="mt-1">
            <Link to="/games/new" className="text-primary underline">
              Log your first game
            </Link>{" "}
            to see stats.
          </p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No games match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <OverviewCards stats={overview} />

          <div className="grid gap-6 lg:grid-cols-2">
            <DeckWinRateChart data={deckStats} />
            <GamesOverTimeChart data={monthlyStats} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ColorBreakdownChart
              data={colorStats}
              totalGames={overview.totalGames}
            />
            <BuddyBreakdown data={buddyStats} />
          </div>

          <MostFacedCommanders data={facedCommanders} />
        </div>
      )}
    </div>
  );
}
