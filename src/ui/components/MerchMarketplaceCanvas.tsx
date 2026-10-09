import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_SKU_LABEL,
  MERCH_SKU_IDS,
  type MerchBulkOffer,
} from "../../economy/merchandising.ts";

type StallHit = { id: string; x: number; y: number; w: number; h: number };

function readToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function offerLines(offer: MerchBulkOffer): string[] {
  for (const id of MERCH_SKU_IDS) {
    const qty = offer.units[id] ?? 0;
    if (qty <= 0) continue;
    const unit = Math.round((offer.ask_price / qty) * 100) / 100;
    return [`${qty} St. · ${formatClubCash(unit)}/St.`];
  }
  return [`${formatClubCash(offer.ask_price)} gesamt`];
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * WIREFRAME: docs/prd/design.md §9.x — Marktplatz (Canvas-Stände)
 */
export function MerchMarketplaceCanvas({
  offers,
  onBuyOffer,
}: {
  offers: readonly MerchBulkOffer[];
  onBuyOffer: (offerId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<StallHit[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tint = readToken("--tinte", "#0f172a");
    const panel = readToken("--surface-raised", readToken("--panel-bg", "#fffef8"));
    const muted = readToken("--text-muted", "#64748b");
    const accent = readToken("--club-accent", "#1e3a5f");
    const yellow = readToken("--sonnengelb", "#facc15");
    const corner = 9;

    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = tint;
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillText("Marktplatz · Whitelabel", 14, 22);

    const hits: StallHit[] = [];
    const pad = 12;
    const gap = 10;
    const cols = width >= 520 ? 2 : 1;
    const stallW = (width - pad * 2 - gap * (cols - 1)) / cols;
    const stallH = cols === 2 ? 118 : 108;
    const startY = 34;

    if (offers.length === 0) {
      ctx.fillStyle = muted;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillText("Keine Angebote — nächste Woche neue Stände.", pad, startY + 24);
      hitsRef.current = hits;
      return;
    }

    offers.forEach((offer, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = pad + col * (stallW + gap);
      const y = startY + row * (stallH + gap);

      ctx.fillStyle = readToken("--panel-bg", "#fff");
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.2;
      roundRectPath(ctx, x, y, stallW, stallH, corner);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      roundRectPath(ctx, x, y, stallW, 5, corner);
      ctx.fill();

      ctx.fillStyle = tint;
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(offer.label, x + 10, y + 24);

      ctx.fillStyle = muted;
      ctx.font = "600 10px system-ui, sans-serif";
      const lines = offerLines(offer);
      lines.forEach((line, li) => {
        ctx.fillText(line, x + 10, y + 40 + li * 14);
      });

      const btnW = 72;
      const btnH = 26;
      const btnX = x + stallW - btnW - 10;
      const btnY = y + stallH - btnH - 10;
      ctx.fillStyle = yellow;
      ctx.strokeStyle = tint;
      roundRectPath(ctx, btnX, btnY, btnW, btnH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = tint;
      ctx.font = "800 10px system-ui, sans-serif";
      ctx.fillText("Kaufen", btnX + 16, btnY + 17);

      ctx.textAlign = "right";
      ctx.fillStyle = tint;
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(formatClubCash(offer.ask_price), x + stallW - 10, y + 24);
      ctx.textAlign = "left";

      hits.push({ id: offer.id, x: btnX, y: btnY, w: btnW, h: btnH });
    });

    hitsRef.current = hits;
  }, [offers]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = hitsRef.current.find(
      (stall) => x >= stall.x && x <= stall.x + stall.w && y >= stall.y && y <= stall.y + stall.h,
    );
    if (hit) onBuyOffer(hit.id);
  }

  return (
    <div className="merch-market-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="merch-market-canvas"
        aria-label="Marktplatz Whitelabel"
        role="img"
        onClick={handleClick}
      />
    </div>
  );
}
