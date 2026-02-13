// ─── MTG Color Identity ──────────────────────────────────────────────

/** Single MTG color code */
export type ManaColor = "W" | "U" | "B" | "R" | "G";

// ─── Commander ───────────────────────────────────────────────────────

export interface Commander {
  name: string;
  colorIdentity: ManaColor[];
  colors?: string[];
  type: string;
}

// ─── Decklist ────────────────────────────────────────────────────────

export interface Decklist {
  mainboard: Record<string, number>;
  commander: Record<string, number>;
  rawText: string;
}

// ─── Deck ────────────────────────────────────────────────────────────

export interface Deck {
  id: number;
  name: string;
  commander: Commander;
  dateAdded: string;
  archived?: boolean;
  sortOrder?: number;
  decklist?: Decklist;
}

// ─── Game ────────────────────────────────────────────────────────────

export interface Opponent {
  name: string;
  commander?: string;
  colorIdentity?: ManaColor[];
}

/** Snapshot of the player's deck at the time the game was recorded. */
export interface GameDeck {
  id: number;
  name: string;
  commander: Pick<Commander, "name" | "colorIdentity">;
}

export interface Game {
  id: number;
  /** Date string, e.g. "2024-01-15" */
  date: string;
  myDeck: GameDeck;
  won: boolean;
  /** Joined color string, e.g. "UB" or "C" for colorless. Split for display. */
  winnerColorIdentity: string;
  /** Commander name of the winner — only set when the player lost. */
  winningCommander?: string;
  opponents: Opponent[];
  totalPlayers: number;
}

// ─── Friends & Social ────────────────────────────────────────────────

export interface FriendRequest {
  fromFriendId: string;
  fromUsername: string;
  timestamp: string;
}

export interface Friend {
  friendId: string;
  username: string;
  uid: string;
}

export interface FriendPublicData {
  friendId: string;
  username: string;
  decks: Deck[];
  games: Game[];
}

// ─── User Profile (Firestore: users/{uid}) ───────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  /** 8-char unique ID (excludes 0, O, 1, I, L) */
  friendId: string;
  username: string;
  friends: string[];
  pendingFriendRequests?: FriendRequest[];
  decks: Deck[];
  games: Game[];
  podBuddies?: string[];
  lastUpdated: unknown; // Firestore Timestamp at runtime
}
