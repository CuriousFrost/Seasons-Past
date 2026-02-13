/**
 * MTG color identity naming utility.
 * Maps all 32 color combinations to their community names.
 * Keys are in WUBRG sort order.
 */

const WUBRG = "WUBRG";

const COLOR_IDENTITY_NAMES: Record<string, string> = {
  // Colorless
  C: "Colorless",
  // Mono
  W: "Mono White",
  U: "Mono Blue",
  B: "Mono Black",
  R: "Mono Red",
  G: "Mono Green",
  // 2-color guilds
  WU: "Azorius",
  WB: "Orzhov",
  WR: "Boros",
  WG: "Selesnya",
  UB: "Dimir",
  UR: "Izzet",
  UG: "Simic",
  BR: "Rakdos",
  BG: "Golgari",
  RG: "Gruul",
  // 3-color shards/wedges
  WUB: "Esper",
  WUR: "Jeskai",
  WUG: "Bant",
  WBR: "Mardu",
  WBG: "Abzan",
  WRG: "Naya",
  UBR: "Grixis",
  UBG: "Sultai",
  URG: "Temur",
  BRG: "Jund",
  // 4-color
  WUBR: "Non-Green",
  WUBG: "Non-Red",
  WURG: "Non-Black",
  WBRG: "Non-Blue",
  UBRG: "Non-White",
  // 5-color
  WUBRG: "5-Color",
};

/** Sort color characters into canonical WUBRG order. */
export function normalizeColorIdentity(ci: string): string {
  if (!ci || ci === "C") return "C";
  return [...ci]
    .filter((c) => WUBRG.includes(c))
    .sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b))
    .join("");
}

/** Get the MTG community name for a color identity string. */
export function getColorIdentityName(ci: string): string {
  const normalized = normalizeColorIdentity(ci);
  return COLOR_IDENTITY_NAMES[normalized] ?? normalized;
}

/** Format as "Name (COLORS)" — e.g. "Jeskai (WUR)". */
export function formatColorIdentityLabel(ci: string): string {
  const normalized = normalizeColorIdentity(ci);
  const name = COLOR_IDENTITY_NAMES[normalized] ?? normalized;
  if (normalized === "C") return "Colorless";
  return `${name} (${normalized})`;
}

// ─── MTG Color Hex Values ───────────────────────────────────────────

const MTG_COLOR_HEX: Record<string, string> = {
  W: "#F9FAF4",
  U: "#0E68AB",
  B: "#150B00",
  R: "#D3202A",
  G: "#00733E",
};

const COLORLESS_HEX = "#71717a"; // zinc-500

/**
 * Returns an SVG linear gradient ID and definition for a color identity string.
 * For single colors: returns a solid fill hex string.
 * For multi-colors: returns a gradient ID to reference with `url(#id)`.
 *
 * Call `getColorGradientDefs()` to get the <defs> elements, and
 * `getColorGradientFill()` to get the fill value for a bar.
 */
export function getColorGradientId(ci: string): string {
  const normalized = normalizeColorIdentity(ci);
  return `mtg-grad-${normalized || "C"}`;
}

export function getColorGradientFill(ci: string): string {
  const normalized = normalizeColorIdentity(ci);
  if (normalized === "C") return COLORLESS_HEX;

  const colors = [...normalized];
  if (colors.length === 1) return MTG_COLOR_HEX[colors[0]] ?? COLORLESS_HEX;

  return `url(#${getColorGradientId(ci)})`;
}

/**
 * Returns SVG <linearGradient> elements for all color identities in the dataset.
 * Render these inside an SVG <defs> block.
 */
export function buildColorGradientDefs(
  colorIdentities: string[],
): { id: string; stops: { offset: string; color: string }[] }[] {
  const defs: { id: string; stops: { offset: string; color: string }[] }[] = [];

  for (const ci of colorIdentities) {
    const normalized = normalizeColorIdentity(ci);
    const chars = [...normalized];
    if (chars.length <= 1) continue; // solid fill, no gradient needed

    const stops = chars.map((c, i) => ({
      offset: `${(i / (chars.length - 1)) * 100}%`,
      color: MTG_COLOR_HEX[c] ?? COLORLESS_HEX,
    }));

    defs.push({ id: getColorGradientId(ci), stops });
  }

  return defs;
}
