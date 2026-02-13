import type { Commander, ManaColor } from "@/types";

const API_BASE = "https://api.scryfall.com";

// ─── Card Image Cache ────────────────────────────────────────────────
// In-memory cache so we never re-fetch the same commander image in a session.
const imageCache = new Map<string, string | null>();

/** Fetch the art_crop image URL for a card name. Returns null on failure. */
export async function fetchCardImageUrl(
  name: string,
): Promise<string | null> {
  const key = name.toLowerCase();
  if (imageCache.has(key)) return imageCache.get(key)!;

  try {
    const res = await fetch(
      `${API_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`,
    );
    if (!res.ok) {
      imageCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const url: string | null =
      data.image_uris?.art_crop ??
      data.card_faces?.[0]?.image_uris?.art_crop ??
      null;
    imageCache.set(key, url);
    return url;
  } catch {
    imageCache.set(key, null);
    return null;
  }
}

/** Returns up to 8 commander name suggestions (legendary creatures only). */
export async function searchCommanderNames(
  query: string,
): Promise<string[]> {
  if (query.length < 2) return [];

  const url = `${API_BASE}/cards/search?q=${encodeURIComponent(query)}+is:commander&order=name&unique=cards`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = (await res.json()) as { data: { name: string }[] };
  return json.data.map((card) => card.name).slice(0, 8);
}

/** Fetches full card data for an exact commander name from Scryfall. */
export async function fetchCommanderByName(
  name: string,
): Promise<Commander | null> {
  const url = `${API_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const card = (await res.json()) as {
    name: string;
    color_identity: string[];
    type_line: string;
  };

  return {
    name: card.name,
    colorIdentity: card.color_identity as ManaColor[],
    type: card.type_line,
  };
}
