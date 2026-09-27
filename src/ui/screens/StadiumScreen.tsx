import { useState } from "react";
import {
  adjustBlockTicketPrice,
  fillRateDeltaFromReference,
  fillRateHeatColor,
  referenceFillRate,
  stadiumAverageTicket,
  stadiumBlockAttendees,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
  tierIcon,
  tierLabel,
  FILL_RATE_MIN,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  type ClubStadium,
  type StadiumBlock,
  type StadiumTier,
} from "../../stadium/club-stadium.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import {
  canPurchaseStadiumUpgrade,
  stadiumUpgradeCatalog,
  stadiumUpgradeCost,
  stadiumUpgradeLevel,
} from "../../stadium/stadium-upgrades.ts";
import {
  fanbaseMood,
  fanbaseMoodIcon,
  fanbaseMoodLabel,
} from "../../stadium/fanbase.ts";
import { DEFAULT_FANBASE } from "../../stadium/club-stadium.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 10 F7.1 — Stadion 2D-Iso (Grundriss, Blöcke, Preiskategorien)
 */
export function StadiumScreen({
  stadium,
  finances,
  onStadiumChange,
  onPurchaseUpgrade,
  onBack,
}: {
  stadium: ClubStadium;
  finances: ClubFinances;
  onStadiumChange: (stadium: ClubStadium) => void;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const capacity = stadiumTotalCapacity(stadium);
  const matchdayIncome = stadiumMatchdayIncome(stadium);
  const avgTicket = stadiumAverageTicket(stadium);
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  const mood = fanbaseMood(fanbase);
  const delta = stadium.fanbase_last_delta;

  const blockOrder = ["north", "west", "east", "south", "vip"] as const;

  return (
    <main className="stadium">
      <header className="stadium-head">
        <button type="button" onClick={onBack} aria-label="Zurück">
          ←
        </button>
        <div>
          <p className="eyebrow">Verein</p>
          <h1>🏟️ {stadium.name}</h1>
          <p className="stadium-sub">
            {capacity.toLocaleString("de-DE")} Plätze · Ø Ticket € {avgTicket.toFixed(0)} · Heimspiel{" "}
            {formatClubCash(matchdayIncome)}
          </p>
        </div>
      </header>

      <section className="stadium-fanbase" aria-label="Fanbase">
        <div className={`stadium-fanbase-card is-${mood}`}>
          <span className="stadium-fanbase-icon" aria-hidden="true">{fanbaseMoodIcon(mood)}</span>
          <div>
            <strong>Fanbase {fanbase}</strong>
            <p>{fanbaseMoodLabel(mood)} · Erfolg &amp; Tabellenplatz steuern die Zuschauerzahl</p>
          </div>
          {delta != null && delta !== 0 ? (
            <span className={delta > 0 ? "stadium-fanbase-delta is-up" : "stadium-fanbase-delta is-down"}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} diese Woche
            </span>
          ) : null}
        </div>
      </section>

      <section className="stadium-upgrades" aria-label="Stadionausbau">
        <h2>🏗️ Ausbau</h2>
        <ul className="stadium-upgrade-list">
          {stadiumUpgradeCatalog().map((upgrade) => {
            const level = stadiumUpgradeLevel(stadium, upgrade.id);
            const maxed = level >= upgrade.max_level;
            const nextCost = maxed ? null : stadiumUpgradeCost(upgrade, level + 1);
            const check = canPurchaseStadiumUpgrade(stadium, finances, upgrade.id);
            return (
              <li key={upgrade.id} className="stadium-upgrade-card">
                <span className="stadium-upgrade-icon" aria-hidden="true">{upgrade.icon}</span>
                <div className="stadium-upgrade-body">
                  <strong>{upgrade.name}</strong>
                  <p>{upgrade.description}</p>
                  <p className="stadium-upgrade-meta">
                    Stufe {level}/{upgrade.max_level}
                    {nextCost != null ? ` · ${formatClubCash(nextCost)}` : " · Max"}
                  </p>
                </div>
                <button
                  type="button"
                  className="stadium-upgrade-buy"
                  disabled={!check.allowed}
                  title={check.reason}
                  onClick={() => onPurchaseUpgrade(upgrade.id)}
                >
                  {maxed ? "✓" : "Kaufen"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Hint text="Preise senken die Auslastung — Fanbase und Ergebnisse heben die Basis an." block>
        <section className="stadium-layout" aria-label="Stadion-Grundriss">
          <StadiumPitchPlan
            blocks={stadium.blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {blockOrder.map((blockId) => {
            const block = stadium.blocks.find((entry) => entry.id === blockId);
            if (!block) return null;
            return (
              <StadiumBlockCard
                key={block.id}
                block={block}
                area={block.id}
                selected={selectedId === block.id}
                onSelect={() => setSelectedId(block.id)}
                onPriceChange={(delta) =>
                  onStadiumChange(adjustBlockTicketPrice(stadium, block.id, delta))
                }
              />
            );
          })}
        </section>
      </Hint>
    </main>
  );
}

function StadiumPitchPlan({
  blocks,
  selectedId,
  onSelect,
}: {
  blocks: readonly StadiumBlock[];
  selectedId: string | null;
  onSelect: (blockId: string) => void;
}) {
  const byId = Object.fromEntries(blocks.map((block) => [block.id, block]));

  const zones: Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> = [
    { id: "north", x: 24, y: 8, w: 272, h: 44, label: "N" },
    { id: "south", x: 24, y: 228, w: 200, h: 44, label: "S" },
    { id: "west", x: 8, y: 58, w: 44, h: 164, label: "W" },
    { id: "east", x: 268, y: 58, w: 44, h: 164, label: "O" },
    { id: "vip", x: 232, y: 228, w: 64, h: 44, label: "VIP" },
  ];

  return (
    <div className="stadium-pitch-map">
      <svg className="stadium-plan" viewBox="0 0 320 280" role="img" aria-label="Stadion-Grundriss">
        <rect x="58" y="58" width="204" height="164" rx="8" fill="#15803d" stroke="#ecfdf5" strokeWidth="2" />
        <circle cx="160" cy="140" r="28" fill="none" stroke="rgb(255 255 255 / 35%)" strokeWidth="2" />
        <line x1="160" y1="58" x2="160" y2="222" stroke="rgb(255 255 255 / 25%)" strokeWidth="2" />
        {zones.map((zone) => {
          const block = byId[zone.id];
          const fillPct = block ? Math.round(block.fill_rate * 100) : 0;
          const selected = selectedId === zone.id;
          const zoneFill = block?.fill_rate ?? FILL_RATE_MIN;
          return (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={6}
                fill={fillRateHeatColor(zoneFill)}
                className={selected ? "stadium-plan-zone is-selected" : "stadium-plan-zone"}
                onClick={() => onSelect(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(zone.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={block ? `${block.name}, ${fillPct}% Auslastung` : zone.label}
              >
                <title>{block ? `${block.name} · ${fillPct}%` : zone.label}</title>
              </rect>
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 + 4}
                textAnchor="middle"
                className="stadium-plan-label"
                pointerEvents="none"
              >
                {zone.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="stadium-plan-hint">Grundriss · Farbe = Auslastung (rot → grün)</p>
    </div>
  );
}

function StadiumBlockCard({
  block,
  area,
  selected,
  onSelect,
  onPriceChange,
}: {
  block: StadiumBlock;
  area: string;
  selected: boolean;
  onSelect: () => void;
  onPriceChange: (delta: number) => void;
}) {
  const sold = stadiumBlockAttendees(block);
  const income = Math.round(stadiumBlockIncome(block));
  const fillPct = Math.round(block.fill_rate * 100);
  const refPct = Math.round(referenceFillRate(block.id) * 100);
  const fillDeltaPts = Math.round(fillRateDeltaFromReference(block) * 100);

  return (
    <article
      className={`stadium-block is-${block.tier}${selected ? " is-selected" : ""}`}
      data-area={area}
      onClick={onSelect}
    >
      <IsoStand tier={block.tier} />
      <div className="stadium-block-body">
        <h2>
          <span aria-hidden="true">{tierIcon(block.tier)}</span> {block.name}
        </h2>
        <p className="stadium-block-meta">
          {tierLabel(block.tier)} · {block.capacity.toLocaleString("de-DE")} Plätze
        </p>
        <FillMeter fillPct={fillPct} refPct={refPct} deltaPts={fillDeltaPts} sold={sold} />
        <div className="stadium-price" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            aria-label={`${block.name} Ticketpreis senken`}
            disabled={block.ticket_price_eur <= TICKET_PRICE_MIN}
            onClick={() => onPriceChange(-2)}
          >
            −
          </button>
          <span>€ {block.ticket_price_eur}</span>
          <button
            type="button"
            aria-label={`${block.name} Ticketpreis erhöhen`}
            disabled={block.ticket_price_eur >= TICKET_PRICE_MAX}
            onClick={() => onPriceChange(2)}
          >
            +
          </button>
        </div>
        <p className="stadium-block-income">Heimspiel {formatClubCash(income)}</p>
      </div>
    </article>
  );
}

function FillMeter({
  fillPct,
  refPct,
  deltaPts,
  sold,
}: {
  fillPct: number;
  refPct: number;
  deltaPts: number;
  sold: number;
}) {
  const tone = fillPct >= refPct - 2 ? "good" : fillPct >= refPct - 12 ? "warn" : "bad";
  return (
    <div className="stadium-fill">
      <div className="stadium-fill-head">
        <span>Auslastung</span>
        <span className="stadium-fill-value">
          {fillPct}%
          {deltaPts !== 0 ? (
            <span className={deltaPts > 0 ? "stadium-fill-delta is-up" : "stadium-fill-delta is-down"}>
              {deltaPts > 0 ? "+" : ""}
              {deltaPts}%
            </span>
          ) : (
            <span className="stadium-fill-ref">Basis {refPct}%</span>
          )}
        </span>
      </div>
      <div className="stadium-fill-track" aria-hidden="true">
        <span className="stadium-fill-ref-mark" style={{ left: `${refPct}%` }} />
        <span className={`stadium-fill-bar is-${tone}`} style={{ width: `${fillPct}%` }} />
      </div>
      <p className="stadium-fill-sold">~{sold.toLocaleString("de-DE")} Zuschauer</p>
    </div>
  );
}

function IsoStand({ tier }: { tier: StadiumTier }) {
  const height = tier === "vip" ? 44 : tier === "seating" ? 34 : 24;
  const width = tier === "vip" ? 48 : 56;
  const roof = tier === "vip" ? "#f5c16c" : tier === "seating" ? "#94a3b8" : "#64748b";
  const wall = tier === "vip" ? "#78350f" : tier === "seating" ? "#334155" : "#1e293b";
  const cx = 60;
  const foot = 78;
  const top = foot - height;
  const halfW = width / 2;
  const halfD = 12;

  return (
    <svg className="stadium-iso" viewBox="0 0 120 96" aria-hidden="true">
      <polygon
        points={`${cx},${top} ${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx - halfW},${top + halfD}`}
        fill={roof}
      />
      <polygon
        points={`${cx - halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx - halfW},${foot}`}
        fill={wall}
      />
      <polygon
        points={`${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx + halfW},${foot}`}
        fill={tier === "standing" ? "#0f172a" : "#475569"}
      />
    </svg>
  );
}
