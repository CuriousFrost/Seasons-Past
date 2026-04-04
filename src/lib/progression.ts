import { normalizeColorIdentity } from "@/lib/mtg-utils";
import { computeBuddyStats, computeDeckStats } from "@/lib/stats";
import type { Deck, Game } from "@/types";

export type AchievementCategory =
  | "Logging"
  | "Wins"
  | "Streaks"
  | "Decks"
  | "Social"
  | "Meta";

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  target: number;
}

export interface AchievementProgress extends AchievementDefinition {
  current: number;
  progress: number;
  unlocked: boolean;
}

export interface PlayerLevelState {
  level: number;
  title: string;
  totalXp: number;
  wins: number;
  losses: number;
  winsXp: number;
  lossesXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progress: number;
  isMaxLevel: boolean;
}

export interface LevelTitleBand {
  startLevel: number;
  endLevel: number;
  title: string;
}

export const XP_PER_WIN = 50;
export const XP_PER_LOSS = 20;
export const MAX_LEVEL = 100;

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  "Logging",
  "Wins",
  "Streaks",
  "Decks",
  "Social",
  "Meta",
];

export const LEVEL_TITLE_BANDS: LevelTitleBand[] = [
  { startLevel: 1, endLevel: 5, title: "Freshly Summoned" },
  { startLevel: 6, endLevel: 10, title: "Mana Tinkerer" },
  { startLevel: 11, endLevel: 15, title: "Table Regular" },
  { startLevel: 16, endLevel: 20, title: "Pod Pathfinder" },
  { startLevel: 21, endLevel: 25, title: "Spell Slinger" },
  { startLevel: 26, endLevel: 30, title: "Deck Brewer" },
  { startLevel: 31, endLevel: 35, title: "Stack Survivor" },
  { startLevel: 36, endLevel: 40, title: "Meta Reader" },
  { startLevel: 41, endLevel: 45, title: "Value Engine" },
  { startLevel: 46, endLevel: 50, title: "Command Tower" },
  { startLevel: 51, endLevel: 55, title: "Threat Assessor" },
  { startLevel: 56, endLevel: 60, title: "Graveyard Guru" },
  { startLevel: 61, endLevel: 65, title: "Turn Cycle Master" },
  { startLevel: 66, endLevel: 70, title: "Win Con Weaver" },
  { startLevel: 71, endLevel: 75, title: "Archenemy" },
  { startLevel: 76, endLevel: 80, title: "Table Monarch" },
  { startLevel: 81, endLevel: 85, title: "Format Sage" },
  { startLevel: 86, endLevel: 90, title: "Season Keeper" },
  { startLevel: 91, endLevel: 95, title: "Planeswalker" },
  { startLevel: 96, endLevel: 100, title: "Seasons Past" },
];

type Metrics = {
  totalGames: number;
  wins: number;
  longestWinStreak: number;
  deckCount: number;
  maxDeckGames: number;
  uniquePersonalCommanders: number;
  podBuddyCount: number;
  maxBuddyGames: number;
  uniqueFacedCommanders: number;
  uniqueWinningDeckColorIdentities: number;
};

type AchievementMetricDefinition = AchievementDefinition & {
  getCurrent: (metrics: Metrics) => number;
};

const ACHIEVEMENT_DEFINITIONS: AchievementMetricDefinition[] = [
  {
    id: "first-shuffle",
    category: "Logging",
    name: "First Shuffle",
    description: "Log your first Commander game.",
    target: 1,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "pod-regular",
    category: "Logging",
    name: "Pod Regular",
    description: "Log 10 total games.",
    target: 10,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "seasoned-tablemate",
    category: "Logging",
    name: "Seasoned Tablemate",
    description: "Log 25 total games.",
    target: 25,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "format-grinder",
    category: "Logging",
    name: "Format Grinder",
    description: "Log 50 total games.",
    target: 50,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "chronicle-keeper",
    category: "Logging",
    name: "Chronicle Keeper",
    description: "Log 100 total games.",
    target: 100,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "grizzled-veteran",
    category: "Logging",
    name: "Grizzled Veteran",
    description: "Log 250 total games.",
    target: 250,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "hall-of-famer",
    category: "Logging",
    name: "Hall of Famer",
    description: "Log 500 total games.",
    target: 500,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "eternal-chronicler",
    category: "Logging",
    name: "Eternal Chronicler",
    description: "Log 1000 total games.",
    target: 1000,
    getCurrent: (metrics) => metrics.totalGames,
  },
  {
    id: "first-blood",
    category: "Wins",
    name: "First Blood",
    description: "Win your first logged game.",
    target: 1,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "closing-the-game",
    category: "Wins",
    name: "Closing the Game",
    description: "Reach 10 wins.",
    target: 10,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "victory-lap",
    category: "Wins",
    name: "Victory Lap",
    description: "Reach 25 wins.",
    target: 25,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "trophy-shelf",
    category: "Wins",
    name: "Trophy Shelf",
    description: "Reach 50 wins.",
    target: 50,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "table-tyrant",
    category: "Wins",
    name: "Table Tyrant",
    description: "Reach 100 wins.",
    target: 100,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "win-machine",
    category: "Wins",
    name: "Win Machine",
    description: "Reach 250 wins.",
    target: 250,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "champion",
    category: "Wins",
    name: "Champion",
    description: "Reach 500 wins.",
    target: 500,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "living-legend",
    category: "Wins",
    name: "Living Legend",
    description: "Reach 1000 wins.",
    target: 1000,
    getCurrent: (metrics) => metrics.wins,
  },
  {
    id: "heater",
    category: "Streaks",
    name: "Heater",
    description: "Hit a 3-game win streak.",
    target: 3,
    getCurrent: (metrics) => metrics.longestWinStreak,
  },
  {
    id: "on-a-tear",
    category: "Streaks",
    name: "On A Tear",
    description: "Hit a 5-game win streak.",
    target: 5,
    getCurrent: (metrics) => metrics.longestWinStreak,
  },
  {
    id: "untouchable",
    category: "Streaks",
    name: "Untouchable",
    description: "Hit a 10-game win streak.",
    target: 10,
    getCurrent: (metrics) => metrics.longestWinStreak,
  },
  {
    id: "sleeved-up",
    category: "Decks",
    name: "Sleeved Up",
    description: "Keep 1 deck in your library, including archived decks.",
    target: 1,
    getCurrent: (metrics) => metrics.deckCount,
  },
  {
    id: "brewmaster",
    category: "Decks",
    name: "Brewmaster",
    description: "Keep 5 decks in your library, including archived decks.",
    target: 5,
    getCurrent: (metrics) => metrics.deckCount,
  },
  {
    id: "arsenal-overflow",
    category: "Decks",
    name: "Arsenal Overflow",
    description: "Keep 10 decks in your library, including archived decks.",
    target: 10,
    getCurrent: (metrics) => metrics.deckCount,
  },
  {
    id: "deck-hoarder",
    category: "Decks",
    name: "Deck Hoarder",
    description: "Keep 20 decks in your library, including archived decks.",
    target: 20,
    getCurrent: (metrics) => metrics.deckCount,
  },
  {
    id: "vault-keeper",
    category: "Decks",
    name: "Vault Keeper",
    description: "Keep 50 decks in your library, including archived decks.",
    target: 50,
    getCurrent: (metrics) => metrics.deckCount,
  },
  {
    id: "signature-deck",
    category: "Decks",
    name: "Signature Deck",
    description: "Log 10 games with a single deck.",
    target: 10,
    getCurrent: (metrics) => metrics.maxDeckGames,
  },
  {
    id: "locked-in",
    category: "Decks",
    name: "Locked In",
    description: "Log 25 games with a single deck.",
    target: 25,
    getCurrent: (metrics) => metrics.maxDeckGames,
  },
  {
    id: "changing-faces",
    category: "Decks",
    name: "Changing Faces",
    description: "Log games with 5 different personal commanders.",
    target: 5,
    getCurrent: (metrics) => metrics.uniquePersonalCommanders,
  },
  {
    id: "colour-portfolio",
    category: "Decks",
    name: "Colour Portfolio",
    description: "Log games with 10 different personal commanders.",
    target: 10,
    getCurrent: (metrics) => metrics.uniquePersonalCommanders,
  },
  {
    id: "deck-shapeshifter",
    category: "Decks",
    name: "Deck Shapeshifter",
    description: "Log games with 20 different personal commanders.",
    target: 20,
    getCurrent: (metrics) => metrics.uniquePersonalCommanders,
  },
  {
    id: "master-builder",
    category: "Decks",
    name: "Master Builder",
    description: "Log games with 30 different personal commanders.",
    target: 30,
    getCurrent: (metrics) => metrics.uniquePersonalCommanders,
  },
  {
    id: "commander-library",
    category: "Decks",
    name: "Commander Library",
    description: "Log games with 50 different personal commanders.",
    target: 50,
    getCurrent: (metrics) => metrics.uniquePersonalCommanders,
  },
  {
    id: "pod-found",
    category: "Social",
    name: "Pod Found",
    description: "Save your first pod buddy.",
    target: 1,
    getCurrent: (metrics) => metrics.podBuddyCount,
  },
  {
    id: "full-pod",
    category: "Social",
    name: "Full Pod",
    description: "Save 4 pod buddies.",
    target: 4,
    getCurrent: (metrics) => metrics.podBuddyCount,
  },
  {
    id: "familiar-face",
    category: "Social",
    name: "Familiar Face",
    description: "Play 5 logged games against one named buddy.",
    target: 5,
    getCurrent: (metrics) => metrics.maxBuddyGames,
  },
  {
    id: "rivalry-forged",
    category: "Social",
    name: "Rivalry Forged",
    description: "Play 10 logged games against one named buddy.",
    target: 10,
    getCurrent: (metrics) => metrics.maxBuddyGames,
  },
  {
    id: "scout-the-field",
    category: "Meta",
    name: "Scout The Field",
    description: "Face 10 unique commanders.",
    target: 10,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "seen-it-all",
    category: "Meta",
    name: "Seen It All",
    description: "Face 25 unique commanders.",
    target: 25,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "threat-encyclopedia",
    category: "Meta",
    name: "Threat Encyclopedia",
    description: "Face 50 unique commanders.",
    target: 50,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "meta-authority",
    category: "Meta",
    name: "Meta Authority",
    description: "Face 75 unique commanders.",
    target: 75,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "omniscient-observer",
    category: "Meta",
    name: "Omniscient Observer",
    description: "Face 100 unique commanders.",
    target: 100,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "commander-almanac",
    category: "Meta",
    name: "Commander Almanac",
    description: "Face 150 unique commanders.",
    target: 150,
    getCurrent: (metrics) => metrics.uniqueFacedCommanders,
  },
  {
    id: "rainbow-report",
    category: "Meta",
    name: "Rainbow Report",
    description: "Win with 5 unique deck color identities.",
    target: 5,
    getCurrent: (metrics) => metrics.uniqueWinningDeckColorIdentities,
  },
];

function getXpToAdvance(level: number): number {
  return Math.round(100 * 1.04 ** (level - 1));
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function getMetrics(games: Game[], decks: Deck[], podBuddies: string[]): Metrics {
  const deckStats = computeDeckStats(games);
  const buddyStats = computeBuddyStats(games);

  const maxDeckGames = deckStats.length
    ? Math.max(...deckStats.map((deck) => deck.total))
    : 0;
  const maxBuddyGames = buddyStats.length
    ? Math.max(...buddyStats.map((buddy) => buddy.total))
    : 0;

  // Compute longest win streak directly — avoids pulling in the full overview stats pipeline.
  const chronological = [...games].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );
  let longestWinStreak = 0;
  let curWin = 0;
  for (const g of chronological) {
    if (g.won) {
      curWin++;
      if (curWin > longestWinStreak) longestWinStreak = curWin;
    } else {
      curWin = 0;
    }
  }

  const uniquePersonalCommanders = new Set<string>();
  const uniqueFacedCommanders = new Set<string>();
  const uniqueWinningDeckColorIdentities = new Set<string>();

  for (const game of games) {
    const personalCommander = normalizeName(game.myDeck.commander.name);
    if (personalCommander) {
      uniquePersonalCommanders.add(personalCommander);
    }

    // Track commanders seen in this game's opponents list so we don't double-count
    // with winningCommander below (mirrors the guard in computeMostFacedCommanders).
    const seenThisGame = new Set<string>();
    for (const opponent of game.opponents) {
      const commanderName = normalizeName(opponent.commander ?? opponent.name ?? "");
      if (commanderName) {
        uniqueFacedCommanders.add(commanderName);
        seenThisGame.add(commanderName);
      }
    }

    const winningCommander = normalizeName(game.winningCommander ?? "");
    if (!game.won && winningCommander && !seenThisGame.has(winningCommander)) {
      uniqueFacedCommanders.add(winningCommander);
    }

    if (game.won) {
      const wonColorIdentity = normalizeColorIdentity(
        game.myDeck.commander.colorIdentity.join(""),
      );
      uniqueWinningDeckColorIdentities.add(wonColorIdentity);
    }
  }

  const normalizedPodBuddies = new Set(
    podBuddies.map(normalizeName).filter(Boolean),
  );

  return {
    totalGames: games.length,
    wins: games.filter((game) => game.won).length,
    longestWinStreak,
    deckCount: decks.length,
    maxDeckGames,
    uniquePersonalCommanders: uniquePersonalCommanders.size,
    podBuddyCount: normalizedPodBuddies.size,
    maxBuddyGames,
    uniqueFacedCommanders: uniqueFacedCommanders.size,
    uniqueWinningDeckColorIdentities: uniqueWinningDeckColorIdentities.size,
  };
}

export function getLevelTitle(level: number): string {
  const clampedLevel = Math.min(MAX_LEVEL, Math.max(1, level));
  return (
    LEVEL_TITLE_BANDS.find(
      (band) =>
        clampedLevel >= band.startLevel && clampedLevel <= band.endLevel,
    )?.title ?? LEVEL_TITLE_BANDS[0].title
  );
}

export function getPlayerLevelState(games: Game[]): PlayerLevelState {
  const wins = games.filter((game) => game.won).length;
  const losses = games.length - wins;
  const winsXp = wins * XP_PER_WIN;
  const lossesXp = losses * XP_PER_LOSS;
  const totalXp = winsXp + lossesXp;

  let level = 1;
  let remainingXp = totalXp;

  while (level < MAX_LEVEL) {
    const xpToAdvance = getXpToAdvance(level);
    if (remainingXp < xpToAdvance) {
      return {
        level,
        title: getLevelTitle(level),
        totalXp,
        wins,
        losses,
        winsXp,
        lossesXp,
        xpIntoLevel: remainingXp,
        xpForNextLevel: xpToAdvance,
        progress: xpToAdvance > 0 ? remainingXp / xpToAdvance : 0,
        isMaxLevel: false,
      };
    }

    remainingXp -= xpToAdvance;
    level++;
  }

  return {
    level: MAX_LEVEL,
    title: getLevelTitle(MAX_LEVEL),
    totalXp,
    wins,
    losses,
    winsXp,
    lossesXp,
    xpIntoLevel: 0,
    xpForNextLevel: null,
    progress: 1,
    isMaxLevel: true,
  };
}

export function getAchievements(
  games: Game[],
  decks: Deck[],
  podBuddies: string[],
): AchievementProgress[] {
  const metrics = getMetrics(games, decks, podBuddies);

  return ACHIEVEMENT_DEFINITIONS.map((achievement) => {
    const current = achievement.getCurrent(metrics);
    const unlocked = current >= achievement.target;

    return {
      id: achievement.id,
      category: achievement.category,
      name: achievement.name,
      description: achievement.description,
      target: achievement.target,
      current,
      unlocked,
      progress:
        achievement.target > 0
          ? Math.min(current / achievement.target, 1)
          : unlocked
            ? 1
            : 0,
    };
  });
}
