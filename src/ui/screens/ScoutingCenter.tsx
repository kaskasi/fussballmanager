import { useMemo, useState } from "react";
import type { PositionPrimary } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import {
  barBand,
  filterMarket,
  headlineCounts,
  targetLabel,
  type ConfidenceBucket,
} from "../../scouting/market-list.ts";
import { formatScoutCa, scoutReveal } from "../../scouting/scout-visibility.ts";
import { Hint } from "../components/Hint.tsx";
import { RowMenu } from "../components/RowMenu.tsx";

const POSITIONS: PositionPrimary[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];

const CONFIDENCE_FILTERS: { bucket: ConfidenceBucket; label: string; title: string; hint: string }[] = [
  { bucket: "known", label: "✅", title: "Gut bekannt", hint: "Spieler mit enger Scout-Schätzung." },
  { bucket: "unclear", label: "🤷", title: "Unklar", hint: "Einige Infos, aber große Unsicherheit." },
  { bucket: "unknown", label: "❓", title: "Unbekannt", hint: "Kaum Wissen — erst scouten und Wochen simulieren." },
];

export function ScoutingCenter({
  targets,
  onSelectTarget,
  onAssignScout,
  onBack,
}: {
  targets: BoardTarget[];
  onSelectTarget: (playerId: string) => void;
  onAssignScout: (playerId: string) => void;
  onBack: () => void;
}) {
  const market = useMemo(
    () => targets.map((target) => ({ player: target.player, estimate: target.estimate })),
    [targets],
  );
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const [confidence, setConfidence] = useState<ConfidenceBucket | "all">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const counts = headlineCounts(market);
  const visible = filterMarket(market, { query, position, confidence });
  const assigned = targets.filter((target) => target.assigned).length;

  return (
    <main className="scouting">
      <header className="scouting-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Scouting</p>
          <h1>👁️ Marktliste</h1>
          <Hint
            text="Übersicht wie gut dein Verein den Markt kennt. ✅ = genau, 🤷 = grob, ❓ = fast blind."
            block
          >
            <p className="scouting-summary">
              <span>✅ Gut bekannt: {counts.known}</span>
              <span>🤷 Unklar: {counts.unclear}</span>
              <span>❓ Unbekannt: {counts.unknown}</span>
            </p>
          </Hint>
          <p className="scouting-scouts">🟢 {assigned} Scout-Ziele aktiv · {visible.length} Treffer</p>
        </div>
      </header>

      <Hint text="Suche nach Name, Position oder Region. ⋮ pro Zeile: scouten oder Profil. Zeile klicken = Profil." block>
        <label className="scouting-search">
          <span className="sr-only">Suche</span>
          <input
            type="search"
            value={query}
            placeholder="Name, Position, Region"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="scouting-chips" role="toolbar" aria-label="Filter">
          <Chip active={position === "all"} onClick={() => setPosition("all")}>Alle</Chip>
          {POSITIONS.map((slot) => (
            <Chip
              key={slot}
              active={position === slot}
              onClick={() => setPosition(position === slot ? "all" : slot)}
            >
              {slot}
            </Chip>
          ))}
          {CONFIDENCE_FILTERS.map((filter) => (
            <Chip
              key={filter.bucket}
              active={confidence === filter.bucket}
              title={filter.title}
              hint={filter.hint}
              onClick={() => setConfidence(confidence === filter.bucket ? "all" : filter.bucket)}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
      </Hint>

      <ul className="scouting-list" aria-label="Marktliste">
        {visible.map((target) => {
          const boardTarget = targets.find((entry) => entry.player.id === target.player.id);
          const isAssigned = boardTarget?.assigned ?? false;
          const reveal = scoutReveal(target.estimate.uncertaintyRange);
          const band = barBand(target.estimate);
          const ca = formatScoutCa(target.player, target.estimate, false);
          return (
            <li key={target.player.id} className="scouting-item">
              <button
                type="button"
                className="scouting-item-main"
                onClick={() => onSelectTarget(target.player.id)}
              >
                <span className="scouting-portrait" aria-hidden="true">{glyph(target.player.position)}</span>
                <span className="scouting-player-card">
                  <strong className="scouting-player-name">
                    {formatPlayerName(target.player)}
                    {isAssigned ? <span className="scouting-active" title="Scout aktiv"> 🟢</span> : null}
                  </strong>
                  <small className="scouting-player-meta">
                    {target.player.position} · {target.player.age} J. · CA {ca}
                  </small>
                </span>
                <span className="scouting-label">{targetLabel(target)}</span>
                <span className="scouting-item-bars">
                  <ScoutBar label="CA" band={band} reveal={reveal} />
                  <ScoutBar label="Fit" band={band} reveal={reveal} />
                </span>
              </button>
              <RowMenu
                open={openMenuId === target.player.id}
                assigned={isAssigned}
                onToggle={() => setOpenMenuId((current) => (current === target.player.id ? null : target.player.id))}
                onClose={() => setOpenMenuId(null)}
                onScout={() => onAssignScout(target.player.id)}
                onOpenProfile={() => onSelectTarget(target.player.id)}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function ScoutBar({
  label,
  band,
  reveal,
}: {
  label: string;
  band: { value: number; low: number; high: number };
  reveal: ReturnType<typeof scoutReveal>;
}) {
  const fill = reveal.showExactSkills ? band.value : Math.round(band.value * reveal.barFillRatio);
  return (
    <span className="scouting-bar">
      <small>{label}</small>
      <span className="scouting-bar-track">
        {reveal.showCi ? (
          <span
            className="scouting-bar-ci"
            style={{ left: `${(band.low / 199) * 100}%`, width: `${((band.high - band.low) / 199) * 100}%` }}
          />
        ) : null}
        <span className="scouting-bar-fill" style={{ width: `${(fill / 199) * 100}%`, opacity: reveal.barFillRatio || 0.15 }} />
      </span>
    </span>
  );
}

function Chip({
  active,
  onClick,
  title,
  hint,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  hint?: string;
  children: string;
}) {
  const chip = (
    <button
      type="button"
      className={active ? "scouting-chip is-active" : "scouting-chip"}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
  if (!hint) return chip;
  return <Hint text={hint}>{chip}</Hint>;
}

function glyph(position: PositionPrimary): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}
