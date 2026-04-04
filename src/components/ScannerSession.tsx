import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchCardImageUrl, searchCards } from "@/lib/scryfall";
import app from "@/lib/firebase";
import type { Deck, Decklist } from "@/types";

// ── Cloud Function client ─────────────────────────────────────────────

const cloudFns = getFunctions(app);

interface RecognizeCardResult {
  cardName: string;
  imageUrl: string | null;
  setName: string;
  colorIdentity: string[];
  typeLine: string;
  confidence: "exact" | "fuzzy";
}

const recognizeCardFn = httpsCallable<
  { imageBase64: string },
  RecognizeCardResult
>(cloudFns, "recognizeCard");

// ── Image helpers ─────────────────────────────────────────────────────

const MTG_RATIO = 63 / 88;

// Send up to 1920 px wide at high quality — Vision API needs sharp text to OCR
const CAPTURE_MAX_PX = 1920;
const CAPTURE_QUALITY = 0.92;

function captureFromVideo(video: HTMLVideoElement): string {
  const nw = video.videoWidth;
  const nh = video.videoHeight;
  const cropW = nw * 0.7;
  const cropH = cropW / MTG_RATIO;
  const cropX = (nw - cropW) / 2;
  const cropY = Math.max(0, (nh - cropH) / 2);
  const clampedH = Math.min(cropH, nh - cropY);
  const targetW = Math.min(CAPTURE_MAX_PX, Math.round(cropW));
  const targetH = Math.round(targetW * (clampedH / cropW));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  canvas
    .getContext("2d")!
    .drawImage(video, cropX, cropY, cropW, clampedH, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY).split(",")[1];
}

async function compressFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(
        1,
        CAPTURE_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", CAPTURE_QUALITY).split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

// ── Types ─────────────────────────────────────────────────────────────

interface ScannedEntry {
  name: string;
  quantity: number;
  /** art_crop thumbnail from Scryfall, null until resolved. */
  imageUrl: string | null;
}

type ScanPhase =
  | "camera"
  | "permission-denied"
  | "no-camera"
  | "processing"
  | "confirm"
  | "manual";

// ── Decklist helpers ──────────────────────────────────────────────────

function scannedToDecklist(entries: ScannedEntry[]): Decklist {
  const mainboard: Record<string, number> = {};
  const lines: string[] = [];
  for (const e of entries) {
    mainboard[e.name] = (mainboard[e.name] ?? 0) + e.quantity;
    lines.push(`${e.quantity} ${e.name}`);
  }
  return { mainboard, commander: {}, rawText: lines.join("\n") };
}

function appendToDecklist(
  existing: Decklist,
  entries: ScannedEntry[],
): Decklist {
  const mainboard = { ...existing.mainboard };
  const newLines: string[] = [];
  for (const e of entries) {
    mainboard[e.name] = (mainboard[e.name] ?? 0) + e.quantity;
    newLines.push(`${e.quantity} ${e.name}`);
  }
  const rawText = [existing.rawText, ...newLines].filter(Boolean).join("\n");
  return { mainboard, commander: existing.commander, rawText };
}

// ── Component ─────────────────────────────────────────────────────────

export interface ScannerSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  onSave: (decklist: Decklist) => void;
}

export function ScannerSession({
  open,
  onOpenChange,
  deck,
  onSave,
}: ScannerSessionProps) {
  // ── Session state ─────────────────────────────────────────────────
  const [scannedCards, setScannedCards] = useState<ScannedEntry[]>([]);
  const [confirmingMerge, setConfirmingMerge] = useState(false);

  // ── Scan-phase state ──────────────────────────────────────────────
  const [scanPhase, setScanPhase] = useState<ScanPhase>("camera");
  const [scanResult, setScanResult] = useState<RecognizeCardResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Manual search state ───────────────────────────────────────────
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualActiveIdx, setManualActiveIdx] = useState(-1);
  const manualDebounce = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Camera refs ───────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // ── Camera lifecycle ──────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanPhase("no-camera");
      return;
    }
    try {
      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        .catch(() =>
          navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
        );
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setScanPhase("permission-denied");
      } else {
        setScanPhase("no-camera");
      }
    }
  }, [stopStream]);

  // Stream runs for the whole session — not tied to scan phase
  useEffect(() => {
    if (open) void startCamera();
    else stopStream();
    return stopStream;
  }, [open, startCamera, stopStream]);

  // Reset all state when the dialog opens
  useEffect(() => {
    if (open) {
      setScannedCards([]);
      setConfirmingMerge(false);
      setScanPhase("camera");
      setScanResult(null);
      setScanError(null);
      setManualQuery("");
      setManualResults([]);
      setManualOpen(false);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => stopStream, [stopStream]);

  // Cancel any in-flight manual search debounce on unmount
  useEffect(() => {
    return () => {
      if (manualDebounce.current) clearTimeout(manualDebounce.current);
    };
  }, []);

  // ── Capture + process ─────────────────────────────────────────────

  async function processBase64(base64: string) {
    setScanPhase("processing");
    setScanError(null);
    try {
      const res = await recognizeCardFn({ imageBase64: base64 });
      setScanResult(res.data);
      setScanPhase("confirm");
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Recognition failed. Try again.",
      );
      setScanPhase("camera");
    }
  }

  function handleCapture() {
    if (!videoRef.current) return;
    void processBase64(captureFromVideo(videoRef.current));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    let base64: string;
    try {
      base64 = await compressFileToBase64(file);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Could not read file.");
      return;
    }
    void processBase64(base64);
  }

  // ── Card confirmation ─────────────────────────────────────────────

  async function addCardToList(name: string) {
    // Fetch thumbnail; falls back to null — the list shows a placeholder
    const thumb = await fetchCardImageUrl(name);
    setScannedCards((prev) => {
      if (prev.some((e) => e.name === name)) {
        return prev.map((e) =>
          e.name === name ? { ...e, quantity: e.quantity + 1 } : e,
        );
      }
      return [...prev, { name, quantity: 1, imageUrl: thumb }];
    });
  }

  async function handleCorrect() {
    if (!scanResult) return;
    await addCardToList(scanResult.cardName);
    setScanResult(null);
    setScanPhase("camera");
  }

  // ── Manual search ─────────────────────────────────────────────────

  function handleManualInput(value: string) {
    setManualQuery(value);
    setManualActiveIdx(-1);
    if (manualDebounce.current) clearTimeout(manualDebounce.current);
    manualDebounce.current = setTimeout(async () => {
      const names = (await searchCards(value)).map((c) => c.name);
      setManualResults(names);
      setManualOpen(names.length > 0);
    }, 250);
  }

  function handleManualKeyDown(e: React.KeyboardEvent) {
    if (!manualOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setManualActiveIdx((i) => Math.min(i + 1, manualResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setManualActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && manualActiveIdx >= 0) {
      e.preventDefault();
      void handleManualSelect(manualResults[manualActiveIdx]);
    } else if (e.key === "Escape") {
      setManualOpen(false);
    }
  }

  async function handleManualSelect(name: string) {
    setManualOpen(false);
    await addCardToList(name);
    setManualQuery("");
    setScanResult(null);
    setScanPhase("camera");
  }

  // ── List adjustments ──────────────────────────────────────────────

  function adjustQty(name: string, delta: number) {
    setScannedCards((prev) => {
      const entry = prev.find((e) => e.name === name);
      if (!entry) return prev;
      if (entry.quantity + delta <= 0) return prev.filter((e) => e.name !== name);
      return prev.map((e) =>
        e.name === name ? { ...e, quantity: e.quantity + delta } : e,
      );
    });
  }

  function removeCard(name: string) {
    setScannedCards((prev) => prev.filter((e) => e.name !== name));
  }

  // ── Done / merge ──────────────────────────────────────────────────

  function handleDone() {
    if (scannedCards.length === 0) {
      onOpenChange(false);
      return;
    }
    const hasExisting =
      Object.keys(deck.decklist?.mainboard ?? {}).length > 0;
    if (hasExisting) {
      setConfirmingMerge(true);
    } else {
      finalizeSave("replace");
    }
  }

  function finalizeSave(mode: "replace" | "append") {
    const final =
      mode === "append" && deck.decklist
        ? appendToDecklist(deck.decklist, scannedCards)
        : scannedToDecklist(scannedCards);
    onSave(final);
    onOpenChange(false);
  }

  // ── Derived ───────────────────────────────────────────────────────

  const totalCards = scannedCards.reduce((sum, e) => sum + e.quantity, 0);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4">
          <DialogTitle className="truncate">
            Scanning: {deck.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* ── Camera panel ──────────────────────────────────────── */}
          <div className="flex shrink-0 flex-col border-b md:w-96 md:border-b-0 md:border-r">
            {/* Video container — fills most of the screen height on mobile */}
            <div
              className="relative overflow-hidden bg-black"
              style={{ aspectRatio: "4/3" }}
            >
              {/* Stream is always live; overlays sit on top */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Guide frame — visible only in camera phase */}
              {scanPhase === "camera" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-xl border-2 border-white/80"
                    style={{
                      height: "82%",
                      aspectRatio: "63/88",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                    }}
                  />
                </div>
              )}

              {/* Processing spinner */}
              {scanPhase === "processing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <p className="text-sm text-white/80">Identifying…</p>
                </div>
              )}

              {/* Confirm — show Scryfall card image centred over frozen video */}
              {scanPhase === "confirm" && scanResult?.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <img
                    src={scanResult.imageUrl}
                    alt={scanResult.cardName}
                    className="h-5/6 w-auto rounded-lg object-contain shadow-xl"
                  />
                </div>
              )}

              {/* Error placeholder */}
              {(scanPhase === "permission-denied" ||
                scanPhase === "no-camera") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Camera className="h-10 w-10 text-white/40" />
                </div>
              )}
            </div>

            {/* Controls area below the video */}
            <div className="flex flex-col gap-2 p-3">
              {/* camera */}
              {scanPhase === "camera" && (
                <>
                  {scanError && (
                    <p className="text-xs text-destructive">{scanError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={handleCapture}
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                      Capture
                    </Button>
                    <input
                      ref={uploadRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleUpload}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => uploadRef.current?.click()}
                      aria-label="Upload image instead"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}

              {/* processing */}
              {scanPhase === "processing" && (
                <p className="text-center text-xs text-muted-foreground">
                  Identifying card…
                </p>
              )}

              {/* confirm */}
              {scanPhase === "confirm" && scanResult && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold leading-tight">
                    {scanResult.cardName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scanResult.setName}
                  </p>
                  {scanResult.confidence === "fuzzy" && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Fuzzy match
                    </span>
                  )}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScanPhase("camera")}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualQuery(scanResult.cardName);
                        setScanPhase("manual");
                      }}
                    >
                      <Search className="mr-1 h-3 w-3" />
                      Wrong?
                    </Button>
                    <Button size="sm" onClick={() => void handleCorrect()}>
                      <Check className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* manual */}
              {scanPhase === "manual" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      autoFocus
                      placeholder="Card name…"
                      value={manualQuery}
                      onChange={(e) => handleManualInput(e.target.value)}
                      onKeyDown={handleManualKeyDown}
                    />
                    {manualOpen && (
                      <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
                        {manualResults.map((name, i) => (
                          <li
                            key={name}
                            className={`cursor-pointer px-3 py-2 text-sm ${
                              i === manualActiveIdx
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                            }`}
                            onMouseEnter={() => setManualActiveIdx(i)}
                            onMouseDown={() => void handleManualSelect(name)}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setScanPhase("camera")}
                  >
                    ← Camera
                  </Button>
                </div>
              )}

              {/* permission-denied */}
              {scanPhase === "permission-denied" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Camera access denied. Allow it in your browser settings,
                    then tap Try Again.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setScanPhase("camera");
                        void startCamera();
                      }}
                    >
                      Try Again
                    </Button>
                    <input
                      ref={uploadRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleUpload}
                    />
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => uploadRef.current?.click()}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
              )}

              {/* no-camera */}
              {scanPhase === "no-camera" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No camera detected. Upload a photo of the card instead.
                  </p>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUpload}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload Photo
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── List panel ────────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Sticky header: card count + Done */}
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {totalCards}
                </span>{" "}
                / 100 cards
              </span>
              <Button size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>

            {/* Replace / append confirmation */}
            {confirmingMerge ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-medium">
                  {deck.name} already has a decklist.
                </p>
                <p className="text-sm text-muted-foreground">
                  Replace it with the {totalCards} scanned card
                  {totalCards !== 1 ? "s" : ""}, or append them to the
                  existing list?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingMerge(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => finalizeSave("append")}
                  >
                    Append
                  </Button>
                  <Button onClick={() => finalizeSave("replace")}>
                    Replace
                  </Button>
                </div>
              </div>
            ) : scannedCards.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Scan your first card to get started
              </div>
            ) : (
              <ul className="flex-1 divide-y overflow-auto">
                {scannedCards.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    {/* Thumbnail */}
                    {entry.imageUrl ? (
                      <img
                        src={entry.imageUrl}
                        alt={entry.name}
                        className="h-10 w-7 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-7 shrink-0 rounded bg-muted" />
                    )}

                    {/* Card name */}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {entry.name}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                        onClick={() => adjustQty(entry.name, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">
                        {entry.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                        onClick={() => adjustQty(entry.name, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="ml-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeCard(entry.name)}
                        aria-label={`Remove ${entry.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
