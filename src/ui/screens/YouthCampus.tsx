import { useMemo, useState, type DragEvent } from "react";
import type { IndividualProgram } from "../../development/individual-training.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { Player, PositionPrimary } from "../../types/player.ts";
import { formatMarketValueShort, type ProSquadSortDirection, type ProSquadSortKey } from "../../squad/pro-roster.ts";
import {
  listYouthSquad,
  sortYouthSquadRows,
  type YouthSquadRow,
} from "../../squad/youth-roster.ts";
import { caDeltaClassName, caDeltaMark, formatCaDelta } from "../../player/ca-tracking.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { SquadSortHeader } from "../components/SquadSortHeader.tsx";
import {
  ACADEMY_FACILITIES,
  academyStage,
  canBuyAcademyUpgrade,
  COACH_ICON_ORDER,
  coachIconLabel,
  facilityById,
  facilityGate,
} from "../../youth/academy.ts";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import { hqIntakeCount } from "../../youth/intake-generator.ts";
import {
  campRoster,
  canBuyYouthCamp,
  MAX_YOUTH_CAMPS,
  YOUTH_CAMP_NATIONS,
  type YouthCamp,
} from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  actionIcon,
  actionLabel,
  pendingInboxItems,
  type DecisionAction,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";
import type { YouthReport } from "../../youth/youth-sim.ts";
import { formatCalendarWeek } from "../../sim/game-calendar.ts";
import {
  coachIconCounts,
  formatYouthReportName,
  resolveYouthReportDrop,
  sortYouthReportPlayerIds,
  YOUTH_REPORT_ACTIONS,
  youthReportStatus,
  youthReportTarget,
  type YouthReportDropAction,
} from "../../youth/youth-report-view.ts";
import { coachIconForPlayer, hasDepartureRisk } from "../components/DecisionInbox.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { MoodPhotoBand } from "../components/MoodPhotoBand.tsx";
import { YOUTH_CAMPUS_HEADER_PHOTO } from "../assets/hub-photos.ts";

/**
 * WIREFRAME: PRD 14.4 — Jugend-Report (Heimat)
 * Jahrgangstabelle bleibt sekundär (PRD 09 Screen 2a).
 */

const DRAG_PLAYER = "text/plain";
type CampusView = "report" | "year" | "campus" | "camps";

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

const DEFAULT_YOUTH_SORT: { key: ProSquadSortKey; direction: ProSquadSortDirection } = {
  key: "position",
  direction: "asc",
};

export function YouthCampus({
  players,
  youthInbox,
  stadiumCapacity,
  season,
  week,
  clubId,
  trainingPlan,
  individualPrograms,
  academyFacility,
  youthCamps,
  cash,
  onSelectPlayer,
  onOpenInbox,
  onInboxDecision,
  onUpgradeAcademy,
  onBuyCamp,
  onToggleCampStaff,
  onPullCampPlayer,
}: {
  players: Player[];
  youthInbox: YouthInboxState;
  stadiumCapacity: number;
  season: number;
  week: number;
  clubId: string;
  trainingPlan: readonly TrainingSlot[];
  individualPrograms: readonly IndividualProgram[];
  academyFacility: AcademyFacility;
  youthCamps: readonly YouthCamp[];
  cash: number;
  onSelectPlayer: (playerId: string) => void;
  onOpenInbox: (itemId?: string) => void;
  onInboxDecision: (itemId: string, action: DecisionAction) => void;
  onUpgradeAcademy: () => void;
  onBuyCamp: (nationId: string) => void;
  onToggleCampStaff: (nationId: string, staffed: boolean) => void;
  onPullCampPlayer: (playerId: string) => void;
}) {
  const [view, setView] = useState<CampusView>("report");
  const report = youthInbox.lastReport;

  return (
    <main className="campus">
      {view === "year" ? (
        <YearGroup
          players={players}
          youthInbox={youthInbox}
          report={report}
          onBack={() => setView("report")}
          onDepartureRisk={() => onOpenInbox()}
          onSelectPlayer={onSelectPlayer}
        />
      ) : view === "campus" ? (
        <CampusGround
          ownedId={academyFacility}
          stadiumCapacity={stadiumCapacity}
          cash={cash}
          onBack={() => setView("report")}
          onOpenYear={() => setView("report")}
          onUpgrade={onUpgradeAcademy}
          onOpenCamps={() => setView("camps")}
        />
      ) : view === "camps" ? (
        <CampBoard
          players={players}
          camps={youthCamps}
          cash={cash}
          onBack={() => setView("campus")}
          onBuy={onBuyCamp}
          onToggleStaff={onToggleCampStaff}
          onPull={onPullCampPlayer}
        />
      ) : (
        <YouthReportHome
          players={players}
          youthInbox={youthInbox}
          report={report}
          season={season}
          week={week}
          clubId={clubId}
          trainingPlan={trainingPlan}
          individualPrograms={individualPrograms}
          ownedId={academyFacility}
          onSelectPlayer={onSelectPlayer}
          onOpenInbox={onOpenInbox}
          onInboxDecision={onInboxDecision}
          onOpenYear={() => setView("year")}
          onOpenCampus={() => setView("campus")}
        />
      )}
    </main>
  );
}

function CampusGround({
  ownedId,
  stadiumCapacity,
  cash,
  onBack,
  onOpenYear,
  onUpgrade,
  onOpenCamps,
}: {
  ownedId: AcademyFacility;
  stadiumCapacity: number;
  cash: number;
  onBack: () => void;
  onOpenYear: () => void;
  onUpgrade: () => void;
  onOpenCamps: () => void;
}) {
  const owned = facilityById(ownedId);
  const buy = canBuyAcademyUpgrade(ownedId, stadiumCapacity, cash);
  return (
    <section>
      <p className="eyebrow">Jugend</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Report">
          ←
        </button>
        <h1>
          <span aria-hidden="true">{owned.icon}</span> {owned.name}
          <span className="youth-report-count">Stufe {academyStage(ownedId)}/3</span>
        </h1>
      </div>
      <p className="youth-report-match">
        Intake {hqIntakeCount(ownedId)} · {owned.effect}
      </p>
      <MoodPhotoBand src={YOUTH_CAMPUS_HEADER_PHOTO} className="youth-campus-band" />
      <div className="campus-ground">
        {ACADEMY_FACILITIES.map((facility) => {
          const gate = facilityGate(ownedId, facility.id, stadiumCapacity);
          const current = gate.status === "current";
          const open = gate.status === "open";
          return (
            <button
              key={facility.id}
              type="button"
              className={current ? "campus-building" : "campus-building is-locked"}
              disabled={current ? false : !open}
              onClick={current ? onOpenYear : open ? onUpgrade : undefined}
              title={facility.effect}
              aria-label={
                current
                  ? `${facility.name}, Report öffnen`
                  : open
                    ? `${facility.name} kaufen`
                    : facility.name
              }
            >
              <IsoBuilding facility={facility.id} />
              <span className="campus-building-name">
                <span aria-hidden="true">{facility.icon}</span> {facility.name}
              </span>
              <span className="campus-building-effect">{facility.effect}</span>
              <GateMark gate={gate} />
            </button>
          );
        })}
      </div>
      {buy.ok ? (
        <p className="campus-upgrade-row">
          <button type="button" className="negotiation-btn negotiation-btn-primary" onClick={onUpgrade}>
            Ausbauen {formatClubCash(buy.cost)}
          </button>
        </p>
      ) : (
        <p className="youth-report-match">{buy.reason}</p>
      )}
      <p className="campus-upgrade-row">
        <button type="button" className="negotiation-btn" onClick={onOpenCamps}>
          🌍 Jugendcamps
        </button>
      </p>
    </section>
  );
}

function CampBoard({
  players,
  camps,
  cash,
  onBack,
  onBuy,
  onToggleStaff,
  onPull,
}: {
  players: readonly Player[];
  camps: readonly YouthCamp[];
  cash: number;
  onBack: () => void;
  onBuy: (nationId: string) => void;
  onToggleStaff: (nationId: string, staffed: boolean) => void;
  onPull: (playerId: string) => void;
}) {
  return (
    <section>
      <p className="eyebrow">Jugend</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Campus">
          ←
        </button>
        <h1>🌍 Jugendcamps</h1>
      </div>
      <p className="youth-report-match">
        Höchstens {MAX_YOUTH_CAMPS} · Betreuer vor Ort, nicht die Profi-Trainer
      </p>
      <ul className="youth-camp-list">
        {YOUTH_CAMP_NATIONS.map((nation) => {
          const owned = camps.find((camp) => camp.id === nation.id);
          const buy = canBuyYouthCamp(camps, nation.id, cash);
          const roster = owned ? campRoster(players, nation.id) : [];
          return (
            <li key={nation.id} className="youth-camp-card">
              <header>
                <strong>
                  <span aria-hidden="true">{nation.flag}</span> {nation.label}
                </strong>
                <span>{nation.region}</span>
              </header>
              {owned ? (
                <>
                  <p>
                    Unterhalt {formatClubCash(nation.upkeepWeekly)}/Wo
                    {owned.staffed ? " · Betreuer an" : ""}
                  </p>
                  <button
                    type="button"
                    className="negotiation-btn"
                    onClick={() => onToggleStaff(nation.id, !owned.staffed)}
                  >
                    {owned.staffed ? "Betreuer abziehen" : "Betreuer einstellen"}
                  </button>
                  <ul className="youth-camp-roster">
                    {roster.length === 0 ? <li>Kein Jahrgang — Saisonende</li> : null}
                    {roster.map((player) => (
                      <li key={player.id}>
                        <button type="button" onClick={() => onPull(player.id)}>
                          {formatPlayerName(player)} · in die Zentrale
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <button
                  type="button"
                  className="negotiation-btn negotiation-btn-primary"
                  disabled={!buy.ok}
                  onClick={() => onBuy(nation.id)}
                >
                  Kaufen {formatClubCash(nation.cost)}
                  {buy.ok ? "" : ` — ${buy.reason}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
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

function YouthReportHome({
  players,
  youthInbox,
  report,
  season,
  week,
  clubId,
  trainingPlan,
  individualPrograms,
  ownedId,
  onSelectPlayer,
  onOpenInbox,
  onInboxDecision,
  onOpenYear,
  onOpenCampus,
}: {
  players: readonly Player[];
  youthInbox: YouthInboxState;
  report: YouthReport | null;
  season: number;
  week: number;
  clubId: string;
  trainingPlan: readonly TrainingSlot[];
  individualPrograms: readonly IndividualProgram[];
  ownedId: AcademyFacility;
  onSelectPlayer: (playerId: string) => void;
  onOpenInbox: (itemId?: string) => void;
  onInboxDecision: (itemId: string, action: DecisionAction) => void;
  onOpenYear: () => void;
  onOpenCampus: () => void;
}) {
  const [team, setTeam] = useState<YouthTeam>("u17");
  const [dropAction, setDropAction] = useState<YouthReportDropAction | null>(null);
  const owned = facilityById(ownedId);
  const roster = useMemo(
    () => sortYouthReportPlayerIds(players, youthInbox, report, team),
    [players, youthInbox, report, team],
  );
  const counts = useMemo(
    () => coachIconCounts(players, youthInbox, report, team),
    [players, youthInbox, report, team],
  );
  const matchLine = report
    ? `U17 ${formatResults(report.u17_results)} · U19 ${formatResults(report.u19_results)}`
    : "Noch kein Spiel — Möbel trotzdem da";

  const applyDrop = (playerId: string, action: YouthReportDropAction) => {
    const result = resolveYouthReportDrop(youthInbox, players, clubId, week, playerId, action);
    if (result.kind === "decide") {
      onInboxDecision(result.itemId, result.action);
      return;
    }
    if (result.kind === "inbox") {
      onOpenInbox(result.itemId);
      return;
    }
    onSelectPlayer(result.playerId);
  };

  const onRowClick = (playerId: string) => {
    const item = pendingInboxItems(youthInbox, players).find((entry) => entry.playerId === playerId);
    if (item?.kind === "departure_risk") {
      onOpenInbox(item.id);
      return;
    }
    onSelectPlayer(playerId);
  };

  return (
    <section className="youth-report" aria-label="Jugend-Report">
      <p className="eyebrow">Jugend</p>
      <header className="youth-report-head">
        <div>
          <h1>
            {team === "u17" ? "U17" : "U19"} Report {formatCalendarWeek(week)}
          </h1>
          <p className="youth-report-campus">
            <button type="button" className="youth-report-campus-btn" onClick={onOpenCampus}>
              <span aria-hidden="true">{owned.icon}</span> Campus-Stufe {academyStage(ownedId)}
            </button>
            {COACH_ICON_ORDER.map((icon) => (
              <span key={icon} className="youth-report-count" title={coachIconLabel(icon)}>
                <span aria-hidden="true">{icon}</span> {counts[icon]}
              </span>
            ))}
          </p>
          <p className="youth-report-match">{matchLine}</p>
        </div>
        <div className="youth-report-tools">
          <div className="segmented-control" role="tablist" aria-label="Jugendteam wählen">
            <button
              type="button"
              role="tab"
              className={team === "u17" ? "is-active" : undefined}
              aria-selected={team === "u17"}
              onClick={() => setTeam("u17")}
            >
              U17
            </button>
            <button
              type="button"
              role="tab"
              className={team === "u19" ? "is-active" : undefined}
              aria-selected={team === "u19"}
              onClick={() => setTeam("u19")}
            >
              U19
            </button>
          </div>
          <button type="button" className="youth-report-year" onClick={onOpenYear}>
            Jahrgang
          </button>
        </div>
      </header>

      <div className="squad-table-wrap">
        <table className="squad-table youth-report-table" aria-label={`${team.toUpperCase()} Report`}>
          <thead>
            <tr>
              <th scope="col" className="squad-col-name">Name</th>
              <th scope="col">Pos</th>
              <th scope="col">CA</th>
              <th scope="col">Ziel</th>
              <th scope="col">Fortschritt</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={6} className="youth-report-empty">
                  Keine Spieler in der {team === "u17" ? "U17" : "U19"}.
                </td>
              </tr>
            ) : (
              roster.map((player) => {
                const target = youthReportTarget(player, individualPrograms, trainingPlan, week);
                const status = youthReportStatus(player, youthInbox, season, report);
                const risk = status.kind === "risk";
                return (
                  <tr
                    key={player.id}
                    className={risk ? "squad-table-row is-risk" : "squad-table-row"}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_PLAYER, player.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onRowClick(player.id)}
                  >
                    <td className="squad-col-name">
                      <button type="button" className="youth-report-badge">
                        {risk ? <span aria-hidden="true">🚩</span> : null}
                        <PlayerPortrait
                          seed={player.portrait_seed}
                          size="sm"
                          className="campus-portrait"
                        />
                        {formatYouthReportName(player)}
                      </button>
                    </td>
                    <td>{player.position}</td>
                    <td className="squad-col-ca">{Math.round(estimateCa(player.attributes, player.position))}</td>
                    <td>
                      <span className="youth-report-ziel">
                        <span aria-hidden="true">{target.icon}</span> {target.title}
                      </span>
                    </td>
                    <td>
                      {target.progress == null ? (
                        "—"
                      ) : (
                        <ProgressPips value={target.progress} />
                      )}
                    </td>
                    <td>
                      <span className={`youth-report-status is-${status.kind}`}>
                        {status.icon ? <span aria-hidden="true">{status.icon}</span> : null} {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="youth-report-actions" aria-label="Entscheidungen">
        {YOUTH_REPORT_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className={
              dropAction === action ? "youth-report-drop is-hot" : "youth-report-drop"
            }
            aria-label={actionLabel(action)}
            onClick={() => onOpenInbox()}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropAction(action);
            }}
            onDragLeave={() => setDropAction((current) => (current === action ? null : current))}
            onDrop={(event: DragEvent<HTMLButtonElement>) => {
              event.preventDefault();
              setDropAction(null);
              const playerId = event.dataTransfer.getData(DRAG_PLAYER);
              if (playerId) applyDrop(playerId, action);
            }}
          >
            <span aria-hidden="true">{actionIcon(action)}</span>
          </button>
        ))}
      </footer>
    </section>
  );
}

function ProgressPips({ value }: { value: number }) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * 4);
  return (
    <span className="youth-progress" aria-label={`${Math.round(value * 100)} Prozent`}>
      {Array.from({ length: 4 }, (_, index) => (
        <i key={index} className={index < filled ? "is-on" : undefined} />
      ))}
    </span>
  );
}

function YearGroup({
  players,
  youthInbox,
  report,
  onBack,
  onDepartureRisk,
  onSelectPlayer,
}: {
  players: readonly Player[];
  youthInbox: YouthInboxState;
  report: YouthReport | null;
  onBack: () => void;
  onDepartureRisk: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const [team, setTeam] = useState<YouthTeam>("u17");
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_YOUTH_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_YOUTH_SORT.direction);

  const u17Count = useMemo(() => players.filter((player) => player.squad_status === "u17").length, [players]);
  const u19Count = useMemo(() => players.filter((player) => player.squad_status === "u19").length, [players]);

  const rows = useMemo(
    () => enrichYouthRows(listYouthSquad(players, team), youthInbox, players),
    [players, youthInbox, team],
  );
  const positions = useMemo(() => positionsInRoster(rows), [rows]);
  const visible = useMemo(() => {
    const filtered = position === "all" ? rows : rows.filter((row) => row.position === position);
    return sortYouthSquadRows(filtered, sortKey, sortDirection);
  }, [rows, position, sortKey, sortDirection]);

  const toggleSort = (key: ProSquadSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "position" ? "asc" : "desc");
  };

  const switchTeam = (next: YouthTeam) => {
    setTeam(next);
    setPosition("all");
    setSortKey(DEFAULT_YOUTH_SORT.key);
    setSortDirection(DEFAULT_YOUTH_SORT.direction);
  };

  return (
    <section className="campus-year">
      <p className="eyebrow">Jugend</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Report">
          ←
        </button>
        <h1>🏫 Jugendkader</h1>
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
          {formatCalendarWeek(report.week)} · U17 {formatResults(report.u17_results)} · U19 {formatResults(report.u19_results)}
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
                <SquadSortHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
                <SquadSortHeader label="Pos" sortKey="position" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Alt" sortKey="age" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="CA" sortKey="ca" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Δ" sortKey="caDelta" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} title="CA seit letzter Woche" />
                <SquadSortHeader label="Wert" sortKey="marketValue" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Min" sortKey="seasonMinutes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="T" sortKey="goals" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="A" sortKey="assists" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="K" sortKey="yellowCards" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Tkl" sortKey="tackles" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Kop" sortKey="headers" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Ø" sortKey="avgRating" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Form" sortKey="form" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <th scope="col">Region</th>
                <th scope="col">Coach</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.playerId}
                  className={row.departureRisk ? "squad-table-row is-risk" : "squad-table-row"}
                  onClick={() => (row.departureRisk ? onDepartureRisk() : onSelectPlayer(row.playerId))}
                >
                  <td className="squad-col-name">
                    {row.departureRisk ? <span className="youth-risk-flag" aria-hidden="true">🚩 </span> : null}
                    {row.displayName}
                  </td>
                  <td>{row.position}</td>
                  <td>{row.age}</td>
                  <td className="squad-col-ca">{row.ca}</td>
                  <td className={caDeltaClassName(row.caDelta)} title="CA seit letzter Woche">
                    <span className="squad-delta-mark" aria-hidden="true">{caDeltaMark(row.caDelta)}</span>
                    {formatCaDelta(row.caDelta)}
                  </td>
                  <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                  <td>{row.seasonMinutes}</td>
                  <td>{row.goals}</td>
                  <td>{row.assists}</td>
                  <td>{row.yellowCards}</td>
                  <td>{row.tackles}</td>
                  <td>{row.headers}</td>
                  <td>{row.avgRating?.toFixed(1) ?? "—"}</td>
                  <td className={`squad-form is-${formTone(row.form)}`} title={`Form ${row.form}`}>
                    {formMark(row.form)}
                  </td>
                  <td className="youth-col-region">{row.region}</td>
                  <td className="youth-col-coach" title={coachIconLabel(row.coachIcon)}>
                    <span aria-label={coachIconLabel(row.coachIcon)}>{row.coachIcon}</span>
                  </td>
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

function formMark(form: number): string {
  if (form >= 2) return "●";
  if (form >= -1) return "▲";
  return "◆";
}

function formTone(form: number): "good" | "mid" | "low" {
  if (form >= 2) return "good";
  if (form >= -1) return "mid";
  return "low";
}

function enrichYouthRows(
  rows: YouthSquadRow[],
  inbox: YouthInboxState,
  players: readonly Player[],
): YouthSquadRow[] {
  return rows.map((row) => ({
    ...row,
    coachIcon: coachIconForPlayer(inbox, row.playerId),
    departureRisk: hasDepartureRisk(inbox, row.playerId, players),
  }));
}

function positionsInRoster(rows: readonly YouthSquadRow[]): PositionPrimary[] {
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

