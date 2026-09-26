import { useMemo, useState } from "react";
import type { Player, PositionPrimary } from "../../types/player.ts";
import { formatPlayerName, roundStat } from "../../types/player-display.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import {
  ACADEMY_FACILITIES,
  facilityById,
  facilityGate,
  sortCampusBadges,
  type CampusBadge,
} from "../../youth/academy.ts";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import type { YouthInboxState } from "../../youth/decision-inbox.ts";
import type { YouthReport } from "../../youth/youth-sim.ts";
import { coachIconForPlayer, DecisionInboxModal, hasDepartureRisk } from "../components/DecisionInbox.tsx";
import type { DecisionAction } from "../../youth/decision-inbox.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 2 — Youth Campus (2D iso)
 */

const OWNED: AcademyFacility = "academy_basic";
const STADIUM_CAPACITY = 0;

const POSITION_ORDER: PositionPrimary[] = [
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

interface YearRow extends CampusBadge {
  position: PositionPrimary;
  displayName: string;
  age: number;
  ca: number;
  region: string;
}

export function YouthCampus({
  players,
  youthInbox,
  onInboxDecision,
  onSelectPlayer,
  yearOpen,
  onYearOpenChange,
}: {
  players: Player[];
  youthInbox: YouthInboxState;
  onInboxDecision: (itemId: string, action: DecisionAction) => void;
  onSelectPlayer: (playerId: string) => void;
  yearOpen: boolean;
  onYearOpenChange: (open: boolean) => void;
}) {
  const [inboxOpen, setInboxOpen] = useState(false);
  const rows = useMemo(() => rosterRows(players, youthInbox), [players, youthInbox]);

  return (
    <main className="campus">
      {yearOpen ? (
        <YearGroup
          rows={rows}
          report={youthInbox.lastReport}
          onBack={() => onYearOpenChange(false)}
          onOpenInbox={() => setInboxOpen(true)}
          onDeparture={() => setInboxOpen(true)}
          onSelectPlayer={onSelectPlayer}
        />
      ) : (
        <CampusGround onOpenYear={() => onYearOpenChange(true)} />
      )}
      {inboxOpen ? (
        <DecisionInboxModal
          inbox={youthInbox}
          players={players}
          onDecision={onInboxDecision}
          onClose={() => setInboxOpen(false)}
        />
      ) : null}
    </main>
  );
}

function CampusGround({ onOpenYear }: { onOpenYear: () => void }) {
  const owned = facilityById(OWNED);
  return (
    <section>
      <p className="eyebrow">Jugend</p>
      <h1>
        <span aria-hidden="true">{owned.icon}</span> {owned.name}
      </h1>
      <div className="campus-ground">
        {ACADEMY_FACILITIES.map((facility) => {
          const gate = facilityGate(OWNED, facility.id, STADIUM_CAPACITY);
          const current = gate.status === "current";
          return (
            <button
              key={facility.id}
              type="button"
              className={current ? "campus-building" : "campus-building is-locked"}
              disabled={!current}
              onClick={current ? onOpenYear : undefined}
              title={facility.effect}
              aria-label={current ? `${facility.name}, Jahrgang öffnen` : facility.name}
            >
              <IsoBuilding facility={facility.id} />
              <span className="campus-building-name">
                <span aria-hidden="true">{facility.icon}</span> {facility.name}
              </span>
              <GateMark gate={gate} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GateMark({ gate }: { gate: ReturnType<typeof facilityGate> }) {
  if (gate.status === "needs_stadium") {
    return (
      <span className="campus-gate">
        <span aria-hidden="true">🏟️</span> {gate.capacity.toLocaleString("de-DE")}
      </span>
    );
  }
  if (gate.status === "needs_performance") {
    return (
      <span className="campus-gate">
        <span aria-hidden="true">🏋️</span>
      </span>
    );
  }
  if (gate.status === "current") {
    return <span className="campus-gate">●</span>;
  }
  return <span className="campus-gate">◆</span>;
}

function formatResults(results: YouthReport["u17_results"]): string {
  return `${results.wins}-${results.draws}-${results.losses}`;
}

function YearGroup({
  rows,
  report,
  onBack,
  onOpenInbox,
  onDeparture,
  onSelectPlayer,
}: {
  rows: YearRow[];
  report: YouthReport | null;
  onBack: () => void;
  onOpenInbox: () => void;
  onDeparture: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const positions = useMemo(() => positionsInRoster(rows), [rows]);
  const visible = useMemo(() => {
    const filtered = position === "all" ? rows : rows.filter((row) => row.position === position);
    return sortCampusBadges(filtered);
  }, [rows, position]);

  return (
    <section className="campus-year">
      <p className="eyebrow">Jahrgang</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Campus">
          ←
        </button>
        <h1>U17 · {visible.length} Spieler</h1>
        <button type="button" className="campus-inbox-open" onClick={onOpenInbox}>
          📥 Inbox
        </button>
      </div>

      {report ? (
        <p className="campus-report">
          Woche {report.week} · U17 {formatResults(report.u17_results)} · U19 {formatResults(report.u19_results)}
        </p>
      ) : (
        <p className="campus-report">Noch kein Jugend-Report — Woche im Hub simulieren.</p>
      )}

      <div className="campus-chips" role="toolbar" aria-label="Position filtern">
        <PositionChip active={position === "all"} onClick={() => setPosition("all")}>Alle</PositionChip>
        {positions.map((slot) => (
          <PositionChip
            key={slot}
            active={position === slot}
            onClick={() => setPosition(position === slot ? "all" : slot)}
          >
            {slot}
          </PositionChip>
        ))}
      </div>

      <div className="campus-table" role="table" aria-label="U17 Kader">
        <div className="campus-table-head" role="row">
          <span role="columnheader" className="campus-col-icon" aria-hidden="true" />
          <span role="columnheader">Name</span>
          <span role="columnheader">Pos</span>
          <span role="columnheader">Alter</span>
          <span role="columnheader">CA</span>
          <span role="columnheader">Region</span>
          <span role="columnheader">Coach</span>
        </div>
        <ul className="campus-list" role="rowgroup">
          {visible.map((row) => (
            <li key={row.playerId} role="none">
              <button
                type="button"
                className={row.departureRisk ? "campus-row is-risk" : "campus-row"}
                onClick={() => (row.departureRisk ? onDeparture() : onSelectPlayer(row.playerId))}
              >
                <span className="campus-portrait" aria-hidden="true">{positionGlyph(row.position)}</span>
                <span className="campus-player-name">{row.displayName}</span>
                <span className="campus-meta">{row.position}</span>
                <span className="campus-meta">{row.age}</span>
                <span className="campus-ca">{roundStat(row.ca)}</span>
                <span className="campus-region">{row.region}</span>
                <span className="campus-coach" title={`Coach ${row.coachIcon}`}>{row.coachIcon}</span>
                {row.departureRisk ? <span className="campus-risk" aria-hidden="true">🚩</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PositionChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" className={active ? "campus-chip is-active" : "campus-chip"} onClick={onClick}>
      {children}
    </button>
  );
}

function positionsInRoster(rows: readonly YearRow[]): PositionPrimary[] {
  const present = new Set(rows.map((row) => row.position));
  return POSITION_ORDER.filter((slot) => present.has(slot));
}

function positionGlyph(position: PositionPrimary): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}

function IsoBuilding({ facility }: { facility: AcademyFacility }) {
  const height = facility === "academy_elite" ? 52 : facility === "academy_performance" ? 38 : 26;
  const halfW = facility === "academy_basic" ? 26 : 36;
  const halfD = 14;
  const roof =
    facility === "academy_elite" ? "#f5c16c" : facility === "academy_performance" ? "#5eead4" : "#4ade80";
  const cx = 70;
  const foot = 86;
  const top = foot - height;
  return (
    <svg className="iso" viewBox="0 0 140 112" aria-hidden="true">
      <polygon
        points={`${cx},${top} ${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx - halfW},${top + halfD}`}
        fill={roof}
      />
      <polygon
        points={`${cx - halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx - halfW},${foot}`}
        fill="#166534"
      />
      <polygon
        points={`${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx + halfW},${foot}`}
        fill="#15803d"
      />
      {facility !== "academy_basic" ? (
        <polygon
          points={`${cx - 8},${foot - 8} ${cx + 8},${foot - 8} ${cx + 8},${foot + 6} ${cx - 8},${foot + 6}`}
          fill="#ecfdf5"
        />
      ) : (
        <polygon points={`${cx - 5},${foot - 2} ${cx + 5},${foot - 2} ${cx + 5},${foot + 8} ${cx - 5},${foot + 8}`} fill="#ecfdf5" />
      )}
    </svg>
  );
}

function rosterRows(players: Player[], inbox: YouthInboxState): YearRow[] {
  return players
    .filter((player) => player.squad_status === "u17")
    .map((player) => ({
      playerId: player.id,
      position: player.position,
      displayName: formatPlayerName(player),
      age: player.age,
      ca: roundStat(estimateCa(player.attributes, player.position)),
      region: player.birth.region,
      coachIcon: coachIconForPlayer(inbox, player.id),
      departureRisk: hasDepartureRisk(inbox, player.id),
    }));
}
