import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Decklist } from "@/types";

interface DecklistImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (decklist: Decklist) => void;
}

type CardEntry = {
  quantity: number;
  cardName: string;
};

const TOTAL_WARN_MIN = 95;
const TOTAL_WARN_MAX = 105;
const SECTION_HEADERS = /^(commander|commanders|deck|mainboard|sideboard|maybeboard|companion|companions|sb|mb)\b/i;

function parseDecklistText(text: string) {
  const lines = text.split(/\r?\n/);
  const cards: CardEntry[] = [];
  const invalidLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    if (SECTION_HEADERS.test(trimmed)) continue;

    const match = trimmed.match(/^(\d+)\s*(x|X)?\s+(.+)$/);
    if (!match) {
      invalidLines.push(trimmed);
      continue;
    }

    const quantity = Number(match[1]);
    const cardName = match[3].trim();

    if (!cardName || Number.isNaN(quantity) || quantity <= 0) {
      invalidLines.push(trimmed);
      continue;
    }

    cards.push({ quantity, cardName });
  }

  return { cards, invalidLines };
}

function totalCards(cards: CardEntry[]) {
  return cards.reduce((sum, card) => sum + card.quantity, 0);
}

function buildRawText(cards: CardEntry[]) {
  return cards.map((card) => `${card.quantity} ${card.cardName}`).join("\n");
}

function cardsToDecklist(cards: CardEntry[], rawText: string): Decklist {
  const mainboard: Record<string, number> = {};
  for (const card of cards) {
    mainboard[card.cardName] = (mainboard[card.cardName] ?? 0) + card.quantity;
  }
  return { mainboard, commander: {}, rawText };
}

function parseMoxfieldDeckId(input: string) {
  if (!input.trim()) return null;

  try {
    const withProtocol = input.startsWith("http") ? input : `https://${input}`;
    const url = new URL(withProtocol);
    if (!url.hostname.includes("moxfield.com")) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "decks" || !segments[1]) return null;

    return segments[1];
  } catch {
    return null;
  }
}

function readMoxfieldSection(payload: Record<string, unknown> | null, key: string) {
  if (!payload) return null;
  const section = payload[key] as Record<string, unknown> | undefined;
  if (!section) return null;
  if (section.cards && typeof section.cards === "object") {
    return section.cards as Record<string, unknown>;
  }
  return section;
}

function extractMoxfieldCards(data: unknown): CardEntry[] {
  if (!data || typeof data !== "object") return [];

  const root = data as Record<string, unknown>;
  const payload = (root.boards as Record<string, unknown> | undefined) ?? root;
  const sections = [
    readMoxfieldSection(payload, "commanders"),
    readMoxfieldSection(payload, "mainboard"),
  ];

  const cards: CardEntry[] = [];

  for (const section of sections) {
    if (!section) continue;
    if (Array.isArray(section)) {
      for (const entry of section) {
        const card = normalizeMoxfieldEntry(entry);
        if (card) cards.push(card);
      }
      continue;
    }
    if (typeof section === "object") {
      for (const entry of Object.values(section)) {
        const card = normalizeMoxfieldEntry(entry);
        if (card) cards.push(card);
      }
    }
  }

  return cards;
}

function normalizeMoxfieldEntry(entry: unknown): CardEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const quantity = Number(record.quantity ?? record.count ?? record.qty);
  const card = record.card as Record<string, unknown> | undefined;
  const cardName =
    (card?.name as string | undefined) ??
    (record.name as string | undefined) ??
    (record.cardName as string | undefined);

  if (!cardName || Number.isNaN(quantity) || quantity <= 0) return null;

  return { quantity, cardName };
}

function Preview({
  cards,
  total,
  emptyLabel,
}: {
  cards: CardEntry[];
  total: number;
  emptyLabel: string;
}) {
  if (cards.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  const showTotalWarning = total < TOTAL_WARN_MIN || total > TOTAL_WARN_MAX;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Preview</span>
        <span className="text-muted-foreground">{total} cards</span>
      </div>
      {showTotalWarning && (
        <p className="text-amber-600 text-sm">
          Total looks off for Commander (expected around 100 cards).
        </p>
      )}
      <div className="border-border max-h-48 overflow-auto rounded-md border">
        <ul className="divide-border divide-y">
          {cards.map((card, index) => (
            <li key={`${card.cardName}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="text-muted-foreground w-6 text-right">
                {card.quantity}
              </span>
              <span className="flex-1">{card.cardName}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DecklistImport({ open, onClose, onImport }: DecklistImportProps) {
  const [tab, setTab] = useState("paste");
  const [pasteText, setPasteText] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlCards, setUrlCards] = useState<CardEntry[]>([]);
  const [urlRawText, setUrlRawText] = useState("");

  const pasteParse = useMemo(() => parseDecklistText(pasteText), [pasteText]);
  const pasteCards = pasteParse.cards;
  const pasteTotal = totalCards(pasteCards);
  const pasteHasInput = pasteText.trim().length > 0;
  const pasteError =
    pasteHasInput && pasteCards.length === 0
      ? "No cards could be parsed. Use lines like '1 Sol Ring'."
      : null;
  const pasteWarning =
    pasteParse.invalidLines.length > 0
      ? `Skipped ${pasteParse.invalidLines.length} unrecognized line(s).`
      : null;

  const urlTotal = totalCards(urlCards);

  function resetState() {
    setTab("paste");
    setPasteText("");
    setUrlValue("");
    setUrlLoading(false);
    setUrlError(null);
    setUrlCards([]);
    setUrlRawText("");
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleFetch() {
    setUrlError(null);
    setUrlCards([]);
    setUrlRawText("");

    const deckId = parseMoxfieldDeckId(urlValue);
    if (!deckId) {
      setUrlError("Enter a valid Moxfield deck URL.");
      return;
    }

    setUrlLoading(true);
    try {
      const response = await fetch(
        `https://api2.moxfield.com/v3/decks/all/${deckId}`
      );

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data = (await response.json()) as unknown;
      const cards = extractMoxfieldCards(data);

      if (cards.length === 0) {
        setUrlError("Could not parse any cards from that deck.");
        return;
      }

      setUrlCards(cards);
      setUrlRawText(buildRawText(cards));
    } catch (error) {
      console.error("Moxfield import failed:", error);
      setUrlError("Failed to fetch that deck from Moxfield.");
    } finally {
      setUrlLoading(false);
    }
  }

  function handleSave() {
    if (tab === "paste") {
      if (pasteCards.length === 0) return;
      onImport(cardsToDecklist(pasteCards, pasteText.trim()));
      handleClose();
      return;
    }

    if (urlCards.length === 0) return;
    onImport(cardsToDecklist(urlCards, urlRawText.trim()));
    handleClose();
  }

  const saveDisabled =
    tab === "paste"
      ? pasteCards.length === 0 || Boolean(pasteError)
      : urlCards.length === 0 || Boolean(urlError) || urlLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Decklist</DialogTitle>
          <DialogDescription>
            Paste a list or pull a deck directly from Moxfield.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="paste">Paste List</TabsTrigger>
            <TabsTrigger value="url">Import from URL</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Decklist</label>
              <Textarea
                placeholder="1 Sol Ring\n1 Command Tower\n1 Arcane Signet"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                aria-invalid={Boolean(pasteError)}
              />
              {pasteError && (
                <p className="text-destructive text-sm">{pasteError}</p>
              )}
              {pasteWarning && (
                <p className="text-amber-600 text-sm">{pasteWarning}</p>
              )}
            </div>

            <Preview
              cards={pasteCards}
              total={pasteTotal}
              emptyLabel="Paste a decklist to see a preview."
            />
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Moxfield URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="https://www.moxfield.com/decks/..."
                  value={urlValue}
                  onChange={(event) => {
                    setUrlValue(event.target.value);
                    setUrlError(null);
                    setUrlCards([]);
                    setUrlRawText("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleFetch();
                    }
                  }}
                  aria-invalid={Boolean(urlError)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleFetch}
                  disabled={urlLoading}
                >
                  {urlLoading ? "Fetching..." : "Fetch"}
                </Button>
              </div>
              {urlError && (
                <p className="text-destructive text-sm">{urlError}</p>
              )}
            </div>

            <Preview
              cards={urlCards}
              total={urlTotal}
              emptyLabel="Fetch a Moxfield deck to see a preview."
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
