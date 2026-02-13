import { normalizeColorIdentity } from "@/lib/mtg-utils";
import type { Deck, Game, ManaColor } from "@/types";

// ─── Overview Stats ─────────────────────────────────────────────────

export interface OverviewStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: string;
  longestWinStreak: number;
  longestLossStreak: number;
  mostPlayedDeck: string | null;
  avgGamesPerMonth: number;
}

export function computeOverviewStats(
  games: Game[],
  _decks: Deck[],
): OverviewStats {
  if (games.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      currentStreak: "—",
      longestWinStreak: 0,
      longestLossStreak: 0,
      mostPlayedDeck: null,
      avgGamesPerMonth: 0,
    };
  }

  const totalGames = games.length;
  const wins = games.filter((g) => g.won).length;
  const losses = totalGames - wins;
  const winRate = Math.round((wins / totalGames) * 100);

  // Current streak — sort by date desc, then by id desc for same-day tiebreak
  const sorted = [...games].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
  );
  const streakType = sorted[0].won;
  let streakCount = 0;
  for (const g of sorted) {
    if (g.won !== streakType) break;
    streakCount++;
  }
  const currentStreak = `${streakCount}${streakType ? "W" : "L"}`;

  // Longest streaks — sort by date asc
  const chronological = [...games].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const g of chronological) {
    if (g.won) {
      curWin++;
      curLoss = 0;
      if (curWin > longestWinStreak) longestWinStreak = curWin;
    } else {
      curLoss++;
      curWin = 0;
      if (curLoss > longestLossStreak) longestLossStreak = curLoss;
    }
  }

  // Most played deck
  const deckCounts = new Map<string, number>();
  for (const g of games) {
    const name = g.myDeck.name;
    deckCounts.set(name, (deckCounts.get(name) ?? 0) + 1);
  }
  let mostPlayedDeck: string | null = null;
  let maxCount = 0;
  for (const [name, count] of deckCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostPlayedDeck = name;
    }
  }

  // Average games per month
  const months = new Set<string>();
  for (const g of games) months.add(g.date.slice(0, 7));
  const avgGamesPerMonth =
    months.size > 0
      ? Math.round((totalGames / months.size) * 10) / 10
      : 0;

  return {
    totalGames,
    wins,
    losses,
    winRate,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    mostPlayedDeck,
    avgGamesPerMonth,
  };
}

// ─── Lifetime GP (year-over-year monthly games) ─────────────────────

export interface LifetimeGPPoint {
  month: string; // "Jan", "Feb", etc.
  [year: string]: number | string; // year keys hold game counts
}

export function computeLifetimeGP(games: Game[]): {
  data: LifetimeGPPoint[];
  years: string[];
} {
  if (games.length === 0) return { data: [], years: [] };

  // Count games per year-month
  const counts = new Map<string, Map<number, number>>(); // year -> monthIdx -> count
  const yearSet = new Set<string>();
  for (const g of games) {
    const year = g.date.slice(0, 4);
    const monthIdx = parseInt(g.date.slice(5, 7), 10) - 1;
    yearSet.add(year);
    if (!counts.has(year)) counts.set(year, new Map());
    const ym = counts.get(year)!;
    ym.set(monthIdx, (ym.get(monthIdx) ?? 0) + 1);
  }

  const years = Array.from(yearSet).sort();

  const data: LifetimeGPPoint[] = MONTH_NAMES.map((month, idx) => {
    const point: LifetimeGPPoint = { month };
    for (const year of years) {
      point[year] = counts.get(year)?.get(idx) ?? 0;
    }
    return point;
  });

  return { data, years };
}

// ─── Deck Stats ─────────────────────────────────────────────────────

export interface DeckStat {
  deckName: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computeDeckStats(games: Game[]): DeckStat[] {
  if (games.length === 0) return [];

  const map = new Map<string, { wins: number; losses: number }>();
  for (const g of games) {
    const name = g.myDeck.name;
    const entry = map.get(name) ?? { wins: 0, losses: 0 };
    if (g.won) entry.wins++;
    else entry.losses++;
    map.set(name, entry);
  }

  return Array.from(map.entries())
    .map(([deckName, { wins, losses }]) => {
      const total = wins + losses;
      return {
        deckName,
        wins,
        losses,
        total,
        winRate: Math.round((wins / total) * 100),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Monthly Stats ──────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface MonthlyStat {
  month: string;
  wins: number;
  losses: number;
}

export function computeMonthlyStats(games: Game[]): MonthlyStat[] {
  if (games.length === 0) return [];

  const map = new Map<string, { wins: number; losses: number }>();
  for (const g of games) {
    const key = g.date.slice(0, 7); // "YYYY-MM"
    const entry = map.get(key) ?? { wins: 0, losses: 0 };
    if (g.won) entry.wins++;
    else entry.losses++;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, { wins, losses }]) => {
      const [year, monthNum] = key.split("-");
      const label = `${MONTH_NAMES[parseInt(monthNum, 10) - 1]} '${year.slice(2)}`;
      return { month: label, wins, losses };
    });
}

// ─── Color Identity Stats ───────────────────────────────────────────

export interface ColorStat {
  /** Normalized color identity string in WUBRG order, e.g. "WUR" or "C" */
  color: string;
  count: number;
}

export function computeColorStats(games: Game[]): ColorStat[] {
  if (games.length === 0) return [];

  const counts = new Map<string, number>();
  for (const g of games) {
    const ci = normalizeColorIdentity(g.winnerColorIdentity);
    counts.set(ci, (counts.get(ci) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Buddy Breakdown ────────────────────────────────────────────────

export interface BuddyStat {
  buddyName: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

/**
 * Computes win/loss stats against each opponent player (buddy).
 *
 * Only counts opponents that have a real player name — in the new format
 * opp.name is the player and opp.commander is the commander. In legacy
 * games where opp.commander is missing, opp.name is actually the
 * commander name (not a buddy), so we skip those.
 *
 * If a user edits a legacy game and adds a player name, the opponent
 * will then have both name + commander set, and it'll appear here.
 */
export function computeBuddyStats(games: Game[]): BuddyStat[] {
  const map = new Map<string, { wins: number; losses: number }>();

  for (const g of games) {
    const seen = new Set<string>();
    for (const opp of g.opponents) {
      // Only count as a buddy when there's a distinct player name
      // (i.e. the commander field exists, so name isn't the commander)
      const playerName = opp.name?.trim();
      if (!playerName) continue;
      if (!opp.commander) continue; // legacy: name IS the commander, skip
      if (seen.has(playerName)) continue; // don't double-count same player in one game
      seen.add(playerName);

      const entry = map.get(playerName) ?? { wins: 0, losses: 0 };
      if (g.won) entry.wins++;
      else entry.losses++;
      map.set(playerName, entry);
    }
  }

  return Array.from(map.entries())
    .map(([buddyName, { wins, losses }]) => {
      const total = wins + losses;
      return {
        buddyName,
        wins,
        losses,
        total,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Most Faced Commanders ──────────────────────────────────────────

export interface FacedCommanderStat {
  commanderName: string;
  colorIdentity: ManaColor[];
  timesFaced: number;
  winsAgainst: number;
  winRate: number;
}

export function computeMostFacedCommanders(games: Game[]): FacedCommanderStat[] {
  const map = new Map<string, { colorIdentity: ManaColor[]; faced: number; wins: number }>();

  function track(commanderName: string, colorIdentity: ManaColor[], playerWon: boolean) {
    const key = commanderName.trim();
    if (!key) return;
    const entry = map.get(key) ?? { colorIdentity: [], faced: 0, wins: 0 };
    entry.faced++;
    if (playerWon) entry.wins++;
    if (colorIdentity.length > entry.colorIdentity.length) {
      entry.colorIdentity = colorIdentity;
    }
    map.set(key, entry);
  }

  for (const g of games) {
    const seen = new Set<string>();

    for (const opp of g.opponents) {
      // New format: opp.commander is the commander name, opp.name is the player
      // Legacy format: opp.commander may be missing; opp.name IS the commander
      const cmdName = opp.commander ?? opp.name;
      if (!cmdName?.trim()) continue;
      seen.add(cmdName.trim());
      track(cmdName, (opp.colorIdentity ?? []) as ManaColor[], g.won);
    }

    // Also track the winning commander from games the player lost,
    // in case it wasn't captured in the opponents list
    if (!g.won && g.winningCommander && !seen.has(g.winningCommander.trim())) {
      track(g.winningCommander, [], g.won);
    }
  }

  return Array.from(map.entries())
    .map(([commanderName, { colorIdentity, faced, wins }]) => ({
      commanderName,
      colorIdentity,
      timesFaced: faced,
      winsAgainst: wins,
      winRate: faced > 0 ? Math.round((wins / faced) * 100) : 0,
    }))
    .sort((a, b) => b.timesFaced - a.timesFaced);
}
