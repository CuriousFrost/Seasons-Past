import type { ManaColor } from "@/types";

/**
 * Renders a shareable end-of-game image (PNG) entirely in the browser.
 * Works for any table — guests included — since it only uses Life Counter
 * state; nothing is uploaded anywhere.
 */

export type OutReason = "life" | "poison" | "commander";

export interface ResultCardSeat {
  name: string;
  commander: string | null;
  colorIdentity: ManaColor[];
  artUrl: string | null;
  life: number;
  outReason: OutReason | null;
  isWinner: boolean;
}

export interface ResultCardData {
  /** Display date, e.g. "Nov 24, 2026". */
  dateLabel: string;
  /** e.g. "1h 12m", or null when the timer never ran. */
  durationLabel: string | null;
  seats: ResultCardSeat[];
}

const W = 1080;
const H = 1350;
const PAD = 60;
const FONT = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const MANA_HEX: Record<ManaColor, string> = {
  W: "#e9e4c6",
  U: "#2f6fb5",
  B: "#4a4458",
  R: "#c8372d",
  G: "#2f7d4f",
};

const OUT_LABEL: Record<OutReason, string> = {
  life: "Out — life",
  poison: "Out — poison",
  commander: "Out — commander damage",
};

function loadImage(url: string, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fill a rounded rect with the image cover-cropped, or a color-identity gradient. */
function drawArt(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  colors: ManaColor[],
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (img) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    const stops = colors.length > 0 ? colors.map((c) => MANA_HEX[c]) : ["#8a8f98", "#5b616b"];
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    if (stops.length === 1) stops.push(stops[0]);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Truncate with an ellipsis so `text` fits `maxWidth` in the current font. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

async function draw(data: ResultCardData, withArt: boolean): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const images = withArt
    ? await Promise.all(data.seats.map((s) => (s.artUrl ? loadImage(s.artUrl) : Promise.resolve(null))))
    : data.seats.map(() => null);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#12141b");
  bg.addColorStop(1, "#1d2230");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f5c542";
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText("SEASONS PAST", PAD, 100);
  ctx.fillStyle = "#a8afbd";
  ctx.font = `500 28px ${FONT}`;
  const meta = [data.dateLabel, data.durationLabel ? `⏱ ${data.durationLabel}` : null]
    .filter(Boolean)
    .join("  ·  ");
  ctx.textAlign = "right";
  ctx.fillText(meta, W - PAD, 100);
  ctx.textAlign = "left";

  // Winner block
  const winnerIdx = Math.max(0, data.seats.findIndex((s) => s.isWinner));
  const winner = data.seats[winnerIdx];
  const wy = 140;
  const wh = 480;
  drawArt(ctx, images[winnerIdx] ?? null, winner.colorIdentity, PAD, wy, W - PAD * 2, wh, 28);
  const shade = ctx.createLinearGradient(0, wy + wh * 0.35, 0, wy + wh);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.save();
  roundRect(ctx, PAD, wy, W - PAD * 2, wh, 28);
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.fillRect(PAD, wy, W - PAD * 2, wh);
  ctx.restore();
  ctx.strokeStyle = "#f5c542";
  ctx.lineWidth = 6;
  roundRect(ctx, PAD, wy, W - PAD * 2, wh, 28);
  ctx.stroke();

  ctx.fillStyle = "#f5c542";
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText("🏆  WINNER", PAD + 40, wy + wh - 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 72px ${FONT}`;
  ctx.fillText(fit(ctx, winner.name, W - PAD * 2 - 260), PAD + 40, wy + wh - 72);
  ctx.fillStyle = "#d7dbe3";
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText(fit(ctx, winner.commander ?? "—", W - PAD * 2 - 80), PAD + 40, wy + wh - 26);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 96px ${FONT}`;
  ctx.fillText(String(winner.life), W - PAD - 40, wy + wh - 72);
  ctx.textAlign = "left";

  // Other seats
  const others = data.seats.map((s, i) => ({ s, img: images[i] ?? null })).filter(({ s }) => !s.isWinner);
  const listTop = wy + wh + 40;
  const listBottom = H - 90;
  const gap = 16;
  const rowH = others.length
    ? Math.min(150, (listBottom - listTop - gap * (others.length - 1)) / others.length)
    : 0;
  others.forEach(({ s, img }, i) => {
    const y = listTop + i * (rowH + gap);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, PAD, y, W - PAD * 2, rowH, 20);
    ctx.fill();
    const artW = Math.round(rowH * 1.45);
    drawArt(ctx, img, s.colorIdentity, PAD, y, artW, rowH, 20);

    const tx = PAD + artW + 28;
    const textW = W - PAD * 2 - artW - 28 - 170;
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(rowH * 0.27)}px ${FONT}`;
    ctx.fillText(fit(ctx, s.name, textW), tx, y + rowH * 0.42);
    ctx.fillStyle = "#a8afbd";
    ctx.font = `500 ${Math.round(rowH * 0.2)}px ${FONT}`;
    const sub = [s.commander, s.outReason ? OUT_LABEL[s.outReason] : null].filter(Boolean).join("  ·  ");
    ctx.fillText(fit(ctx, sub || "—", textW), tx, y + rowH * 0.74);

    ctx.textAlign = "right";
    ctx.fillStyle = s.outReason ? "#f87171" : "#ffffff";
    ctx.font = `800 ${Math.round(rowH * 0.42)}px ${FONT}`;
    ctx.fillText(String(s.life), W - PAD - 28, y + rowH * 0.64);
    ctx.textAlign = "left";
  });

  // Footer
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Tracked with Seasons Past · app.seasonspast.app", W / 2, H - 40);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
    } catch (err) {
      // A cross-origin image without CORS headers "taints" the canvas.
      reject(err);
    }
  });
}

export async function renderResultCard(data: ResultCardData): Promise<Blob> {
  try {
    return await draw(data, true);
  } catch {
    // Fall back to color gradients if any artwork blocked the export.
    return draw(data, false);
  }
}

/** Open the device share sheet with the image, or download it where unsupported. */
export async function shareOrDownloadImage(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return; // user closed the sheet
      // Otherwise fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
