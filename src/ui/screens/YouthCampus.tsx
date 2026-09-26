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
import { pendingInboxItems } from "../../youth/decision-inbox.ts";
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
  const openInbox = () => {
    if (pendingInboxItems(youthInbox).length > 0) setInboxOpen(true);
  };

  return (
    <main className="campus">
      {yearOpen ? (
        <YearGroup
          players={players}
          youthInbox={youthInbox}
          report={youthInbox.lastReport}
          onBack={() => onYearOpenChange(false)}
          onOpenInbox={openInbox}
          onDeparture={openInbox}
          onSelectPlayer={onSelectPlayer}
        />
      ) : (
        <CampusGround onOpenYear={() => onYearOpenChange(true)} />
      )}
      {inboxOpen && pendingInboxItems(youthInbox).length > 0 ? (
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

type YouthTeam = "u17" | "u19";

function YearGroup({
  players,
  youthInbox,
  report,
  onBack,
  onOpenInbox,
  onDeparture,
  onSelectPlayer,
}: {
  players: readonly Player[];
  youthInbox: YouthInboxState;
  report: YouthReport | null;
  onBack: () => void;
  onOpenInbox: () => void;
  onDeparture: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const [team, setTeam] = useState<YouthTeam>("u17");
  const [position, setPosition] = useState<PositionPrimary | "all">("all");

  const u17Count = useMemo(() => players.filter((player) => player.squad_status === "u17").length, [players]);
  const u19Count = useMemo(() => players.filter((player) => player.squad_status === "u19").length, [players]);

  const rows = useMemo(() => rosterRows(players, youthInbox, team), [players, youthInbox, team]);
  const positions = useMemo(() => positionsInRoster(rows), [rows]);
  const visible = useMemo(() => {
    const filtered = position === "all" ? rows : rows.filter((row) => row.position === position);
    return sortCampusBadges(filtered);
  }, [rows, position]);

  const switchTeam = (next: YouthTeam) => {
    setTeam(next);
    setPosition("all");
  };

  return (
    <section className="campus-year">
      <p className="eyebrow">Jugend</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Campus">
          ←
        </button>
        <h1>🏫 Jugendkader</h1>
        <button type="button" className="campus-inbox-open" onClick={onOpenInbox}>
          📥 Inbox
        </button>
      </div>

      <div className="segmented-control" role="tablist" aria-label="Jugendteam wählen">
        <button
          type="button"
          role="tab"
          className={team === "u17" ? "is-active" : undefined}
          aria-selected={team === "u17"}
          onClick={() => switchTeam("u17")}
        >
          U17 · {u17Count}
        </button>
        <button
          type="button"
          role="tab"
          className={team === "u19" ? "is-active" : undefined}
          aria-selected={team === "u19"}
          onClick={() => switchTeam("u19")}
        >
          U19 · {u19Count}
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

      {visible.length === 0 ? (
        <section className="squad-empty campus-roster-empty" aria-label="Leerer Jugendkader">
          <p>Keine Spieler in {team === "u17" ? "der U17" : "der U19"}.</p>
        </section>
      ) : (
        <div className="squad-table-wrap">
          <table className="squad-table youth-roster-table" aria-label={`${team.toUpperCase()} Kader`}>
            <thead>
              <tr>
                <th scope="col" className="squad-col-name">Name</th>
                <th scope="col">Pos</th>
                <th scope="col">Alt</th>
                <th scope="col">CA</th>
                <th scope="col">Region</th>
                <th scope="col">Coach</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.playerId}
                  className={row.departureRisk ? "squad-table-row is-risk" : "squad-table-row"}
                  onClick={() => (row.departureRisk ? onDeparture() : onSelectPlayer(row.playerId))}
                >
                  <td className="squad-col-name">
                    {row.departureRisk ? <span className="youth-risk-flag" aria-hidden="true">🚩 </span> : null}
                    {row.displayName}
                  </td>
                  <td>{row.position}</td>
                  <td>{row.age}</td>
                  <td className="squad-col-ca">{roundStat(row.ca)}</td>
                  <td className="youth-col-region">{row.region}</td>
                  <td className="youth-col-coach" title={`Coach ${row.coachIcon}`}>{row.coachIcon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function rosterRows(players: readonly Player[], inbox: YouthInboxState, team: YouthTeam): YearRow[] {
  return players
    .filter((player) => player.squad_status === team)
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
