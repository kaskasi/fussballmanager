/** WIREFRAME: design.md §9 — Scout-Treffer-Grid, CA & Wert ohne Balken/Text */
import { Activity, Coins } from "lucide-react";
import { barBand } from "../../scouting/market-list.ts";
import type { MarketRow } from "../../scouting/market-roster.ts";
import {
  formatScoutCa,
  formatScoutMarketValue,
  scoutMarketValueBounds,
  scoutReveal,
} from "../../scouting/scout-visibility.ts";

type GlyphVariant = "exact" | "fuzzy" | "unknown";

function filledSegments(mid: number, max: number, count: number): number {
  if (mid <= 0) return 0;
  return Math.min(count, Math.max(1, Math.ceil((mid / max) * count)));
}

function valueSegmentCount(eur: number): number {
  if (eur < 80_000) return 1;
  if (eur < 200_000) return 2;
  if (eur < 500_000) return 3;
  return 4;
}

function SegmentGlyphs({
  count,
  filled,
  variant,
}: {
  count: number;
  filled: number;
  variant: GlyphVariant;
}) {
  return (
    <span className={`scout-segment-glyphs is-${variant}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={index < filled ? "scout-segment is-on" : "scout-segment"} />
      ))}
    </span>
  );
}

export function ScoutHitCardGlyphs({ row, season }: { row: MarketRow; season: number }) {
  const band = barBand(row.estimate);
  const reveal = scoutReveal(row.estimate.uncertaintyRange);
  const bounds = scoutMarketValueBounds(row.player, row.estimate, season, false);

  const caMid = (band.low + band.high) / 2;
  const caKnown = reveal.showCi || reveal.showExactCa;
  const caFilled = caKnown ? filledSegments(caMid, 199, 5) : 0;
  const caVariant: GlyphVariant =
    !caKnown ? "unknown" : reveal.showExactCa ? "exact" : "fuzzy";

  const valueMid = bounds ? (bounds.low + bounds.high) / 2 : 0;
  const valueFilled = bounds ? valueSegmentCount(valueMid) : 0;
  const valueVariant: GlyphVariant = !bounds ? "unknown" : bounds.exact ? "exact" : "fuzzy";

  const caHint = formatScoutCa(row.player, row.estimate, false);
  const valueHint = formatScoutMarketValue(row.player, row.estimate, season, false);

  return (
    <div className="scouting-hits-grid-glyphs scout-stat-rect-grid" aria-label={`CA ${caHint} · ${valueHint}`}>
      <div className="scout-stat-rect-row" title={`CA ${caHint}`}>
        <Activity size={11} strokeWidth={2.5} aria-hidden />
        <SegmentGlyphs count={5} filled={caFilled} variant={caVariant} />
      </div>
      <div className="scout-stat-rect-row" title={valueHint}>
        <Coins size={11} strokeWidth={2.5} aria-hidden />
        <SegmentGlyphs count={4} filled={valueFilled} variant={valueVariant} />
      </div>
    </div>
  );
}
