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
  mostPlayedCommander: string | null;
  avgGamesPerMonth: number;
  nemesisCommander: string | null;
  nemesisRecord: string | null;
  mostFacedOpponentColor: string | null;
  mostFacedOpponentColorCount: number;
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
      mostPlayedCommander: null,
      avgGamesPerMonth: 0,
      nemesisCommander: null,
      nemesisRecord: null,
      mostFacedOpponentColor: null,
      mostFacedOpponentColorCount: 0,
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

  // Most played commander
  const commanderCounts = new Map<string, number>();
  for (const g of games) {
    const name = g.myDeck.commander.name;
    commanderCounts.set(name, (commanderCounts.get(name) ?? 0) + 1);
  }
  let mostPlayedCommander: string | null = null;
  let maxCount = 0;
  for (const [name, count] of commanderCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostPlayedCommander = name;
    }
  }

  // Average games per month
  const months = new Set<string>();
  for (const g of games) months.add(g.date.slice(0, 7));
  const avgGamesPerMonth =
    months.size > 0
      ? Math.round((totalGames / months.size) * 10) / 10
      : 0;

  const nemesis = computeNemesisCommander(games);
  const opponentColor = computeMostFacedOpponentColor(games);

  return {
    totalGames,
    wins,
    losses,
    winRate,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    mostPlayedCommander,
    avgGamesPerMonth,
    nemesisCommander: nemesis?.commanderName ?? null,
    nemesisRecord: nemesis
      ? `${nemesis.winsAgainst}W-${nemesis.lossesAgainst}L (${nemesis.winRate}%)`
      : null,
    mostFacedOpponentColor: opponentColor.color,
    mostFacedOpponentColorCount: opponentColor.count,
  };
}

interface NemesisCommanderSummary {
  commanderName: string;
  winsAgainst: number;
  lossesAgainst: number;
  winRate: number;
}

function computeNemesisCommander(games: Game[]): NemesisCommanderSummary | null {
  const faced = computeMostFacedCommanders(games);
  if (faced.length === 0) return null;

  const MIN_SAMPLE = 2;
  const sampled = faced.filter((entry) => entry.timesFaced >= MIN_SAMPLE);
  const pool = sampled.length > 0 ? sampled : faced;

  const sorted = [...pool].sort((a, b) => {
    const aLosses = a.timesFaced - a.winsAgainst;
    const bLosses = b.timesFaced - b.winsAgainst;
    return (
      bLosses - aLosses ||
      a.winRate - b.winRate ||
      b.timesFaced - a.timesFaced ||
      a.commanderName.localeCompare(b.commanderName)
    );
  });

  const top = sorted[0];
  const lossesAgainst = top.timesFaced - top.winsAgainst;
  if (lossesAgainst <= 0) return null;

  return {
    commanderName: top.commanderName,
    winsAgainst: top.winsAgainst,
    lossesAgainst,
    winRate: top.winRate,
  };
}

function computeMostFacedOpponentColor(games: Game[]): {
  color: string | null;
  count: number;
} {
  const counts = new Map<string, number>();

  for (const game of games) {
    let capturedOpponentColor = false;

    for (const opp of game.opponents) {
      if (!opp.colorIdentity || opp.colorIdentity.length === 0) continue;
      const ci = normalizeColorIdentity(opp.colorIdentity.join(""));
      counts.set(ci, (counts.get(ci) ?? 0) + 1);
      capturedOpponentColor = true;
    }

    // Legacy fallback: if opponent colors are missing, infer one from the winner on a loss.
    if (!capturedOpponentColor && !game.won) {
      const winnerColor = normalizeColorIdentity(game.winnerColorIdentity);
      counts.set(winnerColor, (counts.get(winnerColor) ?? 0) + 1);
    }
  }

  let color: string | null = null;
  let count = 0;
  for (const [candidate, candidateCount] of counts) {
    if (
      candidateCount > count ||
      (candidateCount === count && color !== null && candidate < color)
    ) {
      color = candidate;
      count = candidateCount;
    }
  }

  return { color, count };
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

export interface RecentResultPoint {
  game: number;
  result: number;
  won: boolean;
  outcome: "W" | "L";
  date: string;
  deckName: string;
}

export function computeRecentResults(
  games: Game[],
  limit = 20,
): RecentResultPoint[] {
  if (games.length === 0) return [];

  const recent = [...games]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .slice(-limit);

  return recent.map((game, index) => ({
    game: index + 1,
    result: 1,
    won: game.won,
    outcome: game.won ? "W" : "L",
    date: game.date,
    deckName: game.myDeck.name,
  }));
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
  const map = new Map<
    string,
    { displayName: string; wins: number; losses: number }
  >();

  for (const g of games) {
    const seen = new Set<string>();
    for (const opp of g.opponents) {
      // Only count as a buddy when there's a distinct player name
      // (i.e. the commander field exists, so name isn't the commander)
      const playerName = opp.name?.trim();
      if (!playerName) continue;
      if (!opp.commander) continue; // legacy: name IS the commander, skip
      const normalizedName = playerName.toLowerCase();
      if (seen.has(normalizedName)) continue; // don't double-count same player in one game
      seen.add(normalizedName);

      const entry = map.get(normalizedName) ?? {
        displayName: playerName,
        wins: 0,
        losses: 0,
      };
      if (g.won) entry.wins++;
      else entry.losses++;
      map.set(normalizedName, entry);
    }
  }

  return Array.from(map.entries())
    .map(([, { displayName, wins, losses }]) => {
      const total = wins + losses;
      return {
        buddyName: displayName,
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

// ─── Head-to-Head ───────────────────────────────────────────────────

export interface HeadToHeadCommander {
  commander: string;
  /** Empty when the commander's colors were never recorded. */
  colorIdentity: ManaColor[];
  games: number;
  /** Games the user won while this player was on this commander. */
  myWins: number;
  /** Games this player won on this commander. */
  theirWins: number;
}

export interface HeadToHeadPlayer {
  playerName: string;
  games: number;
  myWins: number;
  theirWins: number;
  /** Sorted by games desc. */
  commanders: HeadToHeadCommander[];
}

/**
 * Record against each opponent player, broken down by the commander they
 * played. Legacy opponents without `commander` (where `name` held the
 * commander) are skipped, like computeBuddyStats. Player and commander names
 * are matched case-insensitively; the first-seen spelling is displayed.
 */
export function computeHeadToHead(games: Game[]): HeadToHeadPlayer[] {
  type CmdEntry = HeadToHeadCommander;
  type PlayerEntry = Omit<HeadToHeadPlayer, "commanders"> & {
    commanders: Map<string, CmdEntry>;
  };
  const players = new Map<string, PlayerEntry>();

  for (const g of games) {
    const winnerKey = g.won ? null : g.winningCommander?.trim().toLowerCase() || null;
    // Per player in this game: the set of commander keys they used.
    const perPlayer = new Map<string, Set<string>>();

    for (const opp of g.opponents) {
      const playerName = opp.name?.trim();
      const cmdName = opp.commander?.trim();
      if (!playerName || !cmdName) continue;
      const playerKey = playerName.toLowerCase();
      const cmdKey = cmdName.toLowerCase();

      let player = players.get(playerKey);
      if (!player) {
        player = { playerName, games: 0, myWins: 0, theirWins: 0, commanders: new Map() };
        players.set(playerKey, player);
      }

      let cmdKeys = perPlayer.get(playerKey);
      if (!cmdKeys) {
        cmdKeys = new Set();
        perPlayer.set(playerKey, cmdKeys);
      }
      if (cmdKeys.has(cmdKey)) continue; // count once per game per commander
      cmdKeys.add(cmdKey);

      const ci = (opp.colorIdentity ?? []) as ManaColor[];
      const cmd = player.commanders.get(cmdKey) ?? {
        commander: cmdName,
        colorIdentity: [],
        games: 0,
        myWins: 0,
        theirWins: 0,
      };
      cmd.games++;
      if (g.won) cmd.myWins++;
      else if (winnerKey === cmdKey) cmd.theirWins++;
      if (ci.length > cmd.colorIdentity.length) cmd.colorIdentity = ci;
      player.commanders.set(cmdKey, cmd);
    }

    // Player totals: once per game regardless of how many commanders.
    for (const [playerKey, cmdKeys] of perPlayer) {
      const player = players.get(playerKey)!;
      player.games++;
      if (g.won) player.myWins++;
      else if (winnerKey && cmdKeys.has(winnerKey)) player.theirWins++;
    }
  }

  return Array.from(players.values())
    .map((p) => ({
      playerName: p.playerName,
      games: p.games,
      myWins: p.myWins,
      theirWins: p.theirWins,
      commanders: Array.from(p.commanders.values()).sort(
        (a, b) =>
          b.games - a.games ||
          a.commander.localeCompare(b.commander, undefined, { sensitivity: "base" }),
      ),
    }))
    .sort(
      (a, b) =>
        b.games - a.games ||
        a.playerName.localeCompare(b.playerName, undefined, { sensitivity: "base" }),
    );
}

// ─── Deck Matchups ──────────────────────────────────────────────────

export interface DeckMatchupOpponent {
  commander: string;
  /** Empty when the commander's colors were never recorded. */
  colorIdentity: ManaColor[];
  games: number;
  wins: number;
  losses: number;
  /** Integer percent (0–100). */
  winRate: number;
}

export interface DeckMatchup {
  deckId: number;
  /** Most recent name the deck was logged under. */
  deckName: string;
  commanderName: string;
  colorIdentity: ManaColor[];
  games: number;
  wins: number;
  losses: number;
  /** Sorted by games desc. */
  opponents: DeckMatchupOpponent[];
}

/**
 * For each of the user's decks (keyed by myDeck.id), the record against every
 * opponent commander that deck has faced. Opponent commander is
 * `opp.commander ?? opp.name` (legacy games stored it in name). Each opponent
 * commander counts once per game; names are matched case-insensitively.
 */
export function computeDeckMatchups(games: Game[]): DeckMatchup[] {
  type DeckEntry = Omit<DeckMatchup, "opponents"> & {
    latestDate: string;
    opponents: Map<string, Omit<DeckMatchupOpponent, "winRate">>;
  };
  const decks = new Map<number, DeckEntry>();

  for (const g of games) {
    let deck = decks.get(g.myDeck.id);
    if (!deck) {
      deck = {
        deckId: g.myDeck.id,
        deckName: g.myDeck.name,
        commanderName: g.myDeck.commander?.name ?? "",
        colorIdentity: g.myDeck.commander?.colorIdentity ?? [],
        latestDate: g.date,
        games: 0,
        wins: 0,
        losses: 0,
        opponents: new Map(),
      };
      decks.set(g.myDeck.id, deck);
    } else if (g.date >= deck.latestDate) {
      deck.latestDate = g.date;
      deck.deckName = g.myDeck.name;
      deck.commanderName = g.myDeck.commander?.name ?? deck.commanderName;
      deck.colorIdentity = g.myDeck.commander?.colorIdentity ?? deck.colorIdentity;
    }

    deck.games++;
    if (g.won) deck.wins++;
    else deck.losses++;

    const seen = new Set<string>();
    for (const opp of g.opponents) {
      const cmdName = (opp.commander ?? opp.name)?.trim();
      if (!cmdName) continue;
      const key = cmdName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const ci = (opp.colorIdentity ?? []) as ManaColor[];
      const entry = deck.opponents.get(key) ?? {
        commander: cmdName,
        colorIdentity: [],
        games: 0,
        wins: 0,
        losses: 0,
      };
      entry.games++;
      if (g.won) entry.wins++;
      else entry.losses++;
      if (ci.length > entry.colorIdentity.length) entry.colorIdentity = ci;
      deck.opponents.set(key, entry);
    }
  }

  return Array.from(decks.values())
    .map((d) => ({
      deckId: d.deckId,
      deckName: d.deckName,
      commanderName: d.commanderName,
      colorIdentity: d.colorIdentity,
      games: d.games,
      wins: d.wins,
      losses: d.losses,
      opponents: Array.from(d.opponents.values())
        .map((o) => ({
          ...o,
          winRate: o.games > 0 ? Math.round((o.wins / o.games) * 100) : 0,
        }))
        .sort(
          (a, b) =>
            b.games - a.games ||
            a.commander.localeCompare(b.commander, undefined, { sensitivity: "base" }),
        ),
    }))
    .sort(
      (a, b) =>
        b.games - a.games ||
        a.deckName.localeCompare(b.deckName, undefined, { sensitivity: "base" }),
    );
}
