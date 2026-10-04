import { useMemo } from "react";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import {
  buildScoutRegionMapModel,
  type ScoutRegionTone,
  type ScoutRegionZoneModel,
} from "../../scouting/scout-region-map.ts";

/**
 * WIREFRAME: PRD 09 Screen 3a — Scout-Karte (read-only v0, F4.4 pins later)
 */
export function ScoutRegionMap({ targets }: { targets: readonly BoardTarget[] }) {
  const model = useMemo(() => buildScoutRegionMapModel(targets), [targets]);

  return (
    <section className="scout-region-map" aria-label="Scout-Karte">
      <header className="scout-region-map-head">
        <h2>Scout-Karte</h2>
        <p className="scout-region-map-hint">
          Wissensstand nach Herkunftsregion · Karte ohne Zuweisung (F4.4)
        </p>
      </header>
      <div className="scout-region-map-body">
        <svg className="scout-region-map-svg" viewBox="0 0 320 200" role="img" aria-hidden="true">
          {model.zones.map((zone, index) => (
            <MapQuadrant key={zone.id} zone={zone} index={index} />
          ))}
        </svg>
        <ul className="scout-region-map-legend">
          {model.zones.map((zone) => (
            <li key={zone.id}>
              <span className={`scout-region-map-swatch is-${zone.tone}`} aria-hidden="true" />
              <span className="scout-region-map-legend-label">
                <strong>{zone.label}</strong>
                <span className="scout-region-map-legend-meta">
                  {zone.playerCount === 0
                    ? "—"
                    : `✅ ${zone.known} · 🤷 ${zone.unclear} · ❓ ${zone.unknown}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MapQuadrant({ zone, index }: { zone: ScoutRegionZoneModel; index: number }) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const x = col * 160 + 8;
  const y = row * 100 + 8;
  const w = 144;
  const h = 84;
  const fill = toneFill(zone.tone);
  const short = zone.label.split("-")[0]?.slice(0, 8) ?? zone.label.slice(0, 10);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke="#64748b" strokeWidth="1.5" />
      <text
        x={x + w / 2}
        y={y + h / 2 - 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#0f172a"
      >
        {short}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="9" fill="#475569">
        {zone.playerCount > 0 ? `${zone.playerCount} Ziele` : "leer"}
      </text>
    </g>
  );
}

function toneFill(tone: ScoutRegionTone): string {
  switch (tone) {
    case "strong":
      return "#a7f3d0";
    case "mixed":
      return "#fde68a";
    case "weak":
      return "#cbd5e1";
    default:
      return "#f1f5f9";
  }
}
