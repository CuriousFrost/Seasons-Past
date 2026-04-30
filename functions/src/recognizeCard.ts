import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as vision from "@google-cloud/vision";

// Initialised once per cold-start; ADC picks up the service-account credentials
// automatically when running on Firebase / GCP.
const visionClient = new vision.ImageAnnotatorClient();

// ---------------------------------------------------------------------------
// Public types (mirrored in the client)
// ---------------------------------------------------------------------------

export interface RecognizeCardRequest {
  /** Raw base64 string (no data-URL prefix). JPEG recommended, max ~1 MB. */
  imageBase64: string;
}

export interface RecognizeCardResult {
  /** Canonical card name as confirmed by Scryfall. */
  cardName: string;
  /** Scryfall normal/large image URL, or null for non-image cards. */
  imageUrl: string | null;
  setName: string;
  colorIdentity: string[];
  typeLine: string;
  /**
   * - "exact"  – Scryfall found the card by exact name match.
   * - "fuzzy"  – Scryfall matched via fuzzy search (minor OCR noise corrected).
   */
  confidence: "exact" | "fuzzy";
}

// ---------------------------------------------------------------------------
// Internal Scryfall shape
// ---------------------------------------------------------------------------

interface ScryfallCard {
  name: string;
  set_name: string;
  color_identity: string[];
  type_line: string;
  image_uris?: {
    normal?: string;
    large?: string;
    small?: string;
    art_crop?: string;
  };
  card_faces?: Array<{
    image_uris?: { normal?: string; large?: string };
  }>;
}

// ---------------------------------------------------------------------------
// Callable function
// ---------------------------------------------------------------------------

// 5 MB decoded; base64 expands by ~4/3 so the wire payload is up to ~6.7 MB.
const MAX_DECODED_BYTES = 5 * 1024 * 1024;

export const recognizeCard = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to scan cards.");
    }

    const data = request.data as RecognizeCardRequest;

    if (!data?.imageBase64) {
      throw new HttpsError("invalid-argument", "imageBase64 is required.");
    }

    // Approx decoded size from base64 length: every 4 chars decode to 3 bytes.
    const approxBytes = Math.floor((data.imageBase64.length * 3) / 4);
    if (approxBytes > MAX_DECODED_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        "Image too large — please use a photo under 5 MB.",
      );
    }

    // Step 1 – OCR via Google Cloud Vision
    let extractedName: string;
    try {
      extractedName = await extractCardName(data.imageBase64);
    } catch (err) {
      throw new HttpsError(
        "internal",
        err instanceof Error
          ? err.message
          : "Failed to read text from the image. Try a clearer photo.",
      );
    }

    // Step 2 – Resolve the OCR result against Scryfall
    try {
      return await resolveWithScryfall(extractedName);
    } catch (_err) {
      throw new HttpsError(
        "not-found",
        `Could not identify "${extractedName}" as a Magic: The Gathering card. ` +
          "Try a clearer photo or enter the name manually.",
      );
    }
  },
);

// ---------------------------------------------------------------------------
// OCR + card-name heuristics
// ---------------------------------------------------------------------------

/**
 * Sends the base64 image to Cloud Vision and returns the most likely card name.
 *
 * MTG card layout heuristics:
 *  • The card name lives in the top ~20 % of the card (title bar).
 *  • It is the first/largest text block in that region.
 *  • Mana symbols, rules text, set info, and artist credits are all lower.
 *
 * Strategy:
 *  1. Use fullTextAnnotation (block-level bounding boxes) to isolate text in
 *     the top 22 % of the page.
 *  2. Take the first qualifying block whose reconstructed text is ≥ 2 chars.
 *  3. Fall back to the first non-empty line of the raw text if page dimensions
 *     are unavailable (e.g. very small images).
 */
async function extractCardName(base64: string): Promise<string> {
  const [response] = await visionClient.textDetection({
    image: { content: base64 },
  });

  const fullText = response.fullTextAnnotation;
  if (!fullText?.pages?.length) {
    throw new Error(
      "No text detected on the card. Try a clearer photo with better lighting.",
    );
  }

  const page = fullText.pages[0];
  const pageHeight = page.height ?? 0;

  if (pageHeight > 0) {
    // Threshold: anything with its top edge above 22 % of the image height is
    // a candidate for the name bar.
    const threshold = pageHeight * 0.22;

    for (const block of page.blocks ?? []) {
      const vertices = block.boundingBox?.vertices ?? [];
      if (vertices.length === 0) continue;

      const blockTopY = Math.min(...vertices.map((v) => v.y ?? Infinity));
      if (blockTopY > threshold) continue;

      // Rebuild word text from symbols so we don't lose compound words.
      const words: string[] = [];
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          const wordText = (word.symbols ?? [])
            .map((s) => s.text ?? "")
            .join("");
          if (wordText) words.push(wordText);
        }
      }

      const blockText = words.join(" ").trim();
      if (blockText.length >= 2) return blockText;
    }
  }

  // Fallback: first non-empty line of the raw concatenated text.
  const firstLine =
    fullText.text
      ?.split("\n")
      .map((l) => l.trim())
      .find((l) => l.length >= 2) ?? "";

  if (!firstLine) {
    throw new Error(
      "Could not extract a card name from the image. " +
        "Make sure the top of the card (the name bar) is visible and in focus.",
    );
  }

  return firstLine;
}

// ---------------------------------------------------------------------------
// Scryfall resolution
// ---------------------------------------------------------------------------

/**
 * Tries an exact Scryfall lookup first, then falls back to fuzzy.
 * Throws if neither finds the card.
 */
async function resolveWithScryfall(name: string): Promise<RecognizeCardResult> {
  const exactRes = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
  );
  if (exactRes.ok) {
    return buildResult((await exactRes.json()) as ScryfallCard, "exact");
  }

  const fuzzyRes = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
  );
  if (!fuzzyRes.ok) {
    throw new Error(`Card not found on Scryfall: "${name}"`);
  }
  return buildResult((await fuzzyRes.json()) as ScryfallCard, "fuzzy");
}

function buildResult(
  card: ScryfallCard,
  confidence: "exact" | "fuzzy",
): RecognizeCardResult {
  const imageUrl =
    card.image_uris?.normal ??
    card.image_uris?.large ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.large ??
    null;

  return {
    cardName: card.name,
    imageUrl,
    setName: card.set_name,
    colorIdentity: card.color_identity,
    typeLine: card.type_line,
    confidence,
  };
}
