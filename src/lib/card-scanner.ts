const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${import.meta.env.VITE_GOOGLE_AI_API_KEY}`;

/** Resize and JPEG-compress a File to a raw base64 string (no data-URL prefix). */
async function compressImage(
  file: File,
  maxPx = 1024,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for scanning."));
    };

    img.src = objectUrl;
  });
}

/** Send a base64 JPEG to Gemini Vision and return the raw card name it reads. */
async function extractCardNameFromBase64(base64: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: { mime_type: "image/jpeg", data: base64 },
            },
            {
              text: "This is a photo of a Magic: The Gathering card. What is the card's name? Reply with ONLY the card name, exactly as printed. No punctuation, no explanation.",
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 32, temperature: 0 },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Scan failed: ${body.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const name: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!name) throw new Error("Could not read a card name from the image.");
  return name;
}

/**
 * Use Scryfall fuzzy search to turn the AI's raw string into the canonical
 * card name (handles minor spelling differences from vision recognition).
 */
async function resolveCanonicalName(rawName: string): Promise<string> {
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(rawName)}`,
  );
  if (!res.ok) throw new Error(`"${rawName}" wasn't recognised as a Magic card.`);
  const card = await res.json() as { name: string };
  return card.name;
}

/**
 * Capture → compress → Gemini Vision → Scryfall fuzzy match.
 * Returns the canonical Scryfall card name ready for fetchCommanderByName().
 */
export async function scanCardFromFile(file: File): Promise<string> {
  if (!import.meta.env.VITE_GOOGLE_AI_API_KEY) {
    throw new Error("VITE_GOOGLE_AI_API_KEY is not set in .env.local");
  }
  const base64 = await compressImage(file);
  const rawName = await extractCardNameFromBase64(base64);
  return resolveCanonicalName(rawName);
}
