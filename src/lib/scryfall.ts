import type { Commander, ManaColor } from "@/types";

const API_BASE = "https://api.scryfall.com";

// ─── Card Image Cache ────────────────────────────────────────────────
// In-memory cache so we never re-fetch the same commander image in a session.
const RATE_LIMIT_MS = 75;
const MAX_AUTOCOMPLETE_RESULTS = 5;
const MAX_COMMANDER_RESULTS = 8;

export const SCRYFALL_DEBOUNCE_MS = 300;

export interface ScryfallCard {
  name: string;
  imageUrl: string;
  artCropUrl: string;
  colorIdentity: string[];
  typeLine: string;
  setName: string;
  manaCost: string;
  scryfallUri: string;
}

interface ScryfallImageUris {
  normal?: string;
  art_crop?: string;
}

interface ScryfallApiCard {
  name: string;
  color_identity?: string[];
  type_line?: string;
  set_name?: string;
  mana_cost?: string;
  scryfall_uri?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: Array<{
    image_uris?: ScryfallImageUris;
  }>;
}

interface ScryfallAutocompleteResponse {
  data?: string[];
}

interface ScryfallSearchResponse {
  data?: Array<{
    name: string;
  }>;
}

export type DebouncedFunction<TArgs extends unknown[]> = ((
  ...args: TArgs
) => void) & {
  cancel: () => void;
};

const searchCache = new Map<string, Promise<ScryfallCard[]>>();
const namedCardCache = new Map<string, Promise<ScryfallCard | null>>();
const commanderNameCache = new Map<string, Promise<string[]>>();

let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestStartedAt = 0;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const request = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestStartedAt;
    if (lastRequestStartedAt !== 0 && elapsed < RATE_LIMIT_MS) {
      await delay(RATE_LIMIT_MS - elapsed);
    }

    lastRequestStartedAt = Date.now();
    return fetch(url);
  });

  requestQueue = request.then(
    () => undefined,
    () => undefined,
  );

  return request;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${API_BASE}${path}?${search.toString()}`;
}

function mapScryfallCard(card: ScryfallApiCard): ScryfallCard {
  const imageUrl =
    card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
  const artCropUrl =
    card.image_uris?.art_crop ??
    card.card_faces?.[0]?.image_uris?.art_crop ??
    "";

  return {
    name: card.name,
    imageUrl,
    artCropUrl,
    colorIdentity: card.color_identity ?? [],
    typeLine: card.type_line ?? "",
    setName: card.set_name ?? "",
    manaCost: card.mana_cost ?? "",
    scryfallUri: card.scryfall_uri ?? "",
  };
}

async function fetchCard(url: string): Promise<ScryfallCard | null> {
  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as ScryfallApiCard;
    return mapScryfallCard(data);
  } catch {
    return null;
  }
}

async function getExactCardByName(name: string): Promise<ScryfallCard | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const key = `exact:${normalizeKey(trimmed)}`;
  const cached = namedCardCache.get(key);
  if (cached) return cached;

  const promise = fetchCard(buildUrl("/cards/named", { exact: trimmed }));
  namedCardCache.set(key, promise);
  return promise;
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const key = normalizeKey(trimmed);
  const cached = searchCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await rateLimitedFetch(
        buildUrl("/cards/autocomplete", { q: trimmed }),
      );
      if (!res.ok) return [];

      const data = (await res.json()) as ScryfallAutocompleteResponse;
      const names = (data.data ?? []).slice(0, MAX_AUTOCOMPLETE_RESULTS);
      const cards: ScryfallCard[] = [];

      for (const name of names) {
        const card = await getExactCardByName(name);
        if (card) cards.push(card);
      }

      return cards;
    } catch {
      return [];
    }
  })();

  searchCache.set(key, promise);
  return promise;
}

export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const key = `fuzzy:${normalizeKey(trimmed)}`;
  const cached = namedCardCache.get(key);
  if (cached) return cached;

  const promise = fetchCard(buildUrl("/cards/named", { fuzzy: trimmed }));
  namedCardCache.set(key, promise);
  return promise;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs = SCRYFALL_DEBOUNCE_MS,
): DebouncedFunction<TArgs> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: TArgs) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, delayMs);
  }) as DebouncedFunction<TArgs>;

  debounced.cancel = () => {
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}

/** Fetch the art_crop image URL for a card name. Returns null on failure. */
export async function fetchCardImageUrl(
  name: string,
): Promise<string | null> {
  const card = await getCardByName(name);
  return card?.artCropUrl || null;
}

/** Returns up to 8 commander name suggestions (legendary creatures only). */
export async function searchCommanderNames(
  query: string,
): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const key = normalizeKey(trimmed);
  const cached = commanderNameCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await rateLimitedFetch(
        buildUrl("/cards/search", {
          q: `${trimmed} is:commander`,
          order: "name",
          unique: "cards",
        }),
      );
      if (!res.ok) return [];

      const data = (await res.json()) as ScryfallSearchResponse;
      return (data.data ?? [])
        .map((card) => card.name)
        .slice(0, MAX_COMMANDER_RESULTS);
    } catch {
      return [];
    }
  })();

  commanderNameCache.set(key, promise);
  return promise;
}

/** Compatibility wrapper that maps a card lookup into the app's Commander shape. */
export async function fetchCommanderByName(
  name: string,
): Promise<Commander | null> {
  const card = await getCardByName(name);
  if (!card) return null;

  return {
    name: card.name,
    colorIdentity: card.colorIdentity as ManaColor[],
    type: card.typeLine,
  };
}
