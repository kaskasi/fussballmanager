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
  const total = MERCH_SKU_IDS.reduce((sum, id) => sum + (offer.units[id] ?? 0), 0);
  const unitAvg = total > 0 ? offer.ask_price / total : 0;
  const lines: string[] = [];
  for (const id of MERCH_SKU_IDS) {
    const qty = offer.units[id] ?? 0;
    if (qty <= 0) continue;
    lines.push(
      `${MERCH_SKU_LABEL[id]} · ab ${qty} St. · ${formatClubCash(Math.round(unitAvg * 100) / 100)}/St.`,
    );
  }
  if (lines.length === 0) {
    lines.push(`${formatClubCash(offer.ask_price)} gesamt`);
  }
  return lines.slice(0, 3);
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
    const panel = readToken("--panel-bg", "#fffef8");
    const muted = readToken("--text-muted", "#64748b");
    const accent = readToken("--club-accent", "#1e3a5f");
    const yellow = readToken("--sonnengelb", "#facc15");

    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, width - 1.5, height - 1.5);

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

      ctx.fillStyle = "#fff";
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.2;
      ctx.fillRect(x, y, stallW, stallH);
      ctx.strokeRect(x + 0.6, y + 0.6, stallW - 1.2, stallH - 1.2);

      ctx.fillStyle = accent;
      ctx.fillRect(x, y, stallW, 5);

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
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeRect(btnX + 0.6, btnY + 0.6, btnW - 1.2, btnH - 1.2);
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
    <canvas
      ref={canvasRef}
      className="merch-market-canvas"
      aria-label="Marktplatz Whitelabel"
      role="img"
      onClick={handleClick}
    />
  );
}
