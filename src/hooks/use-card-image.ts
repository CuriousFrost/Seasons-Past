import { useEffect, useState } from "react";
import { fetchCardImageUrl } from "@/lib/scryfall";

/** Returns the Scryfall art_crop URL for a card name, or null while loading / on error. */
export function useCardImage(cardName: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cardName) return;
    let cancelled = false;

    fetchCardImageUrl(cardName).then((result) => {
      if (!cancelled) setUrl(result);
    });

    return () => {
      cancelled = true;
    };
  }, [cardName]);

  return url;
}
