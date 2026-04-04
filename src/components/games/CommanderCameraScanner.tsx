import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, Search, Upload } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchCommanderNames } from "@/lib/scryfall";
import app from "@/lib/firebase";

// ── Cloud Function ────────────────────────────────────────────────────

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

type Phase =
  | "camera"
  | "permission-denied"
  | "no-camera"
  | "processing"
  | "confirm"
  | "manual";

export interface CommanderCameraScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the canonical Scryfall card name the user confirms. */
  onCardScanned: (cardName: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────

export function CommanderCameraScanner({
  open,
  onOpenChange,
  onCardScanned,
}: CommanderCameraScannerProps) {
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<RecognizeCardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualActiveIdx, setManualActiveIdx] = useState(-1);
  const manualDebounce = useRef<ReturnType<typeof setTimeout>>(null);

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
      setPhase("no-camera");
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
        setPhase("permission-denied");
      } else {
        setPhase("no-camera");
      }
    }
  }, [stopStream]);

  useEffect(() => {
    if (open) void startCamera();
    else stopStream();
    return stopStream;
  }, [open, startCamera, stopStream]);

  useEffect(() => {
    if (open) {
      setPhase("camera");
      setResult(null);
      setError(null);
      setManualQuery("");
      setManualResults([]);
      setManualOpen(false);
    }
  }, [open]);

  useEffect(() => stopStream, [stopStream]);

  useEffect(() => {
    return () => {
      if (manualDebounce.current) clearTimeout(manualDebounce.current);
    };
  }, []);

  // ── Scan pipeline ─────────────────────────────────────────────────

  async function processBase64(base64: string) {
    setPhase("processing");
    setError(null);
    try {
      const res = await recognizeCardFn({ imageBase64: base64 });
      setResult(res.data);
      setPhase("confirm");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Recognition failed. Try again.",
      );
      setPhase("camera");
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
    try {
      void processBase64(await compressFileToBase64(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────

  function confirmCard(cardName: string) {
    onCardScanned(cardName);
    onOpenChange(false);
  }

  // ── Manual search (commander names only) ─────────────────────────

  function handleManualInput(value: string) {
    setManualQuery(value);
    setManualActiveIdx(-1);
    if (manualDebounce.current) clearTimeout(manualDebounce.current);
    manualDebounce.current = setTimeout(async () => {
      const names = await searchCommanderNames(value);
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
      confirmCard(manualResults[manualActiveIdx]);
    } else if (e.key === "Escape") {
      setManualOpen(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  const title =
    phase === "confirm"
      ? "Confirm Commander"
      : phase === "manual"
        ? "Search Commander"
        : "Scan Commander";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95svh] flex-col overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="px-4 pb-2 pt-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* ── Camera ─────────────────────────────────────────────── */}
        {(phase === "camera" ||
          phase === "processing" ||
          phase === "confirm") && (
          <div className="flex min-h-0 flex-col overflow-y-auto">
            <div
              className="relative shrink-0 overflow-hidden bg-black"
              style={{ aspectRatio: "4/3", maxHeight: "55svh" }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {phase === "camera" && (
                <>
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
                  <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/70">
                    Align card within the frame
                  </p>
                </>
              )}

              {phase === "processing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <p className="text-sm text-white/80">Identifying…</p>
                </div>
              )}

              {phase === "confirm" && result?.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <img
                    src={result.imageUrl}
                    alt={result.cardName}
                    className="h-5/6 w-auto rounded-lg object-contain shadow-xl"
                  />
                </div>
              )}
            </div>

            {/* Controls below video */}
            <div className="space-y-3 px-4 py-3">
              {phase === "camera" && (
                <>
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleCapture}>
                      <Camera className="mr-2 h-4 w-4" />
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
                      onClick={() => uploadRef.current?.click()}
                      aria-label="Upload image instead"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {phase === "confirm" && result && (
                <div className="space-y-2">
                  <p className="font-semibold leading-tight">{result.cardName}</p>
                  <p className="text-xs text-muted-foreground">{result.setName}</p>
                  {result.confidence === "fuzzy" && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Fuzzy match
                    </span>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPhase("camera")}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualQuery(result.cardName);
                        setPhase("manual");
                      }}
                    >
                      <Search className="mr-1 h-3 w-3" />
                      Wrong?
                    </Button>
                    <Button size="sm" onClick={() => confirmCard(result.cardName)}>
                      <Check className="mr-1 h-3 w-3" />
                      Use
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Permission denied ──────────────────────────────────── */}
        {phase === "permission-denied" && (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Camera access denied</p>
              <p className="text-sm text-muted-foreground">
                Allow camera access in your browser settings, then tap Try Again.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setPhase("camera"); void startCamera(); }}>
                Try Again
              </Button>
              <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
              <Button onClick={() => uploadRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        )}

        {/* ── No camera ──────────────────────────────────────────── */}
        {phase === "no-camera" && (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No camera detected. Upload a photo of the card instead.
            </p>
            <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
            <Button onClick={() => uploadRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
          </div>
        )}

        {/* ── Manual search ──────────────────────────────────────── */}
        {phase === "manual" && (
          <div className="space-y-3 px-4 pb-4">
            <p className="text-sm text-muted-foreground">Search for the correct commander:</p>
            <div className="relative">
              <Input
                autoFocus
                placeholder="Commander name…"
                value={manualQuery}
                onChange={(e) => handleManualInput(e.target.value)}
                onKeyDown={handleManualKeyDown}
              />
              {manualOpen && (
                <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
                  {manualResults.map((name, i) => (
                    <li
                      key={name}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        i === manualActiveIdx
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onMouseEnter={() => setManualActiveIdx(i)}
                      onMouseDown={() => confirmCard(name)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setPhase("camera")}>
              ← Back to Camera
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
