/** WIREFRAME: docs/prd/design.md §9.12 — Jugend (eine Tabelle, U17/U19/Camps) */
import { Fragment, useMemo, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flag,
  Frown,
  PenLine,
  RefreshCw,
  Rocket,
  Target,
  type LucideIcon,
} from "lucide-react";
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
  academyStage,
  coachIconLabel,
  facilityById,
  type CoachIcon,
} from "../../youth/academy.ts";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import { hqIntakeCount } from "../../youth/intake-generator.ts";
import {
  CAMP_CARD_ROSTER_SLOTS,
  CAMP_CARD_ROSTER_SLOTS_COMPACT,
  MAX_YOUTH_CAMPS,
  YOUTH_CAMP_NATIONS,
  type YouthCamp,
} from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
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
  formatYouthReportName,
  resolveYouthReportDrop,
  youthReportStatus,
  youthReportTarget,
  YOUTH_REPORT_ACTIONS,
  type YouthReportDropAction,
} from "../../youth/youth-report-view.ts";
import { coachIconForPlayer, hasDepartureRisk } from "../components/DecisionInbox.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { YouthCampCard } from "../components/YouthCampCard.tsx";

const DRAG_PLAYER = "text/plain";
type YouthTab = "u17" | "u19" | "camps";

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
  season,
  week,
  clubId,
  trainingPlan,
  individualPrograms,
  academyFacility,
  youthCamps,
  masterSeed,
  cash,
  onSelectPlayer,
  onOpenInbox,
  onInboxDecision,
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
  masterSeed: number;
  cash: number;
  onSelectPlayer: (playerId: string) => void;
  onOpenInbox: (itemId?: string) => void;
  onInboxDecision: (itemId: string, action: DecisionAction) => void;
  onBuyCamp: (nationId: string) => void;
  onToggleCampStaff: (nationId: string, staffed: boolean) => void;
  onPullCampPlayer: (playerId: string) => void;
}) {
  const [tab, setTab] = useState<YouthTab>("u17");
  const report = youthInbox.lastReport;
  const u17Count = useMemo(
    () => players.filter((player) => player.squad_status === "u17").length,
    [players],
  );
  const u19Count = useMemo(
    () => players.filter((player) => player.squad_status === "u19").length,
    [players],
  );
  const owned = facilityById(academyFacility);
  const matchLine = report
    ? `U17 ${formatResults(report.u17_results)} · U19 ${formatResults(report.u19_results)}`
    : "Noch kein Spiel — Woche simulieren";

  const youthTabs: { id: YouthTab; label: string }[] = [
    { id: "u17", label: `U17 · ${u17Count}` },
    { id: "u19", label: `U19 · ${u19Count}` },
    { id: "camps", label: "Camps" },
  ];

  return (
    <main className="campus club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label="Jugend-Bereich">
        {youthTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "u17" || tab === "u19" ? (
        <div className="fm-tab-panel">
          <p className="youth-strip game-panel">
            Campus Stufe {academyStage(academyFacility)}/3 · Intake {hqIntakeCount(academyFacility)} ·{" "}
            {formatCalendarWeek(week)}: {matchLine}
            <span className="youth-strip-facility"> · {owned.name}</span>
          </p>
          <YouthUnifiedRoster
            team={tab}
            players={players}
            youthInbox={youthInbox}
            report={report}
            season={season}
            week={week}
            clubId={clubId}
            trainingPlan={trainingPlan}
            individualPrograms={individualPrograms}
            onSelectPlayer={onSelectPlayer}
            onOpenInbox={onOpenInbox}
            onInboxDecision={onInboxDecision}
          />
        </div>
      ) : null}

      {tab === "camps" ? (
        <div className="fm-tab-panel">
          <YouthCampsPanel
            players={players}
            camps={youthCamps}
            masterSeed={masterSeed}
            cash={cash}
            onBuy={onBuyCamp}
            onToggleStaff={onToggleCampStaff}
            onPull={onPullCampPlayer}
          />
        </div>
      ) : null}
    </main>
  );
}

function formatResults(results: YouthReport["u17_results"]): string {
  return `${results.wins}-${results.draws}-${results.losses}`;
}

function YouthUnifiedRoster({
  team,
  players,
  youthInbox,
  report,
  season,
  week,
  clubId,
  trainingPlan,
  individualPrograms,
  onSelectPlayer,
  onOpenInbox,
  onInboxDecision,
}: {
  team: "u17" | "u19";
  players: readonly Player[];
  youthInbox: YouthInboxState;
  report: YouthReport | null;
  season: number;
  week: number;
  clubId: string;
  trainingPlan: readonly TrainingSlot[];
  individualPrograms: readonly IndividualProgram[];
  onSelectPlayer: (playerId: string) => void;
  onOpenInbox: (itemId?: string) => void;
  onInboxDecision: (itemId: string, action: DecisionAction) => void;
}) {
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_YOUTH_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_YOUTH_SORT.direction);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dropAction, setDropAction] = useState<YouthReportDropAction | null>(null);

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

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
    <section className="game-panel youth-roster-panel" aria-label={`${team.toUpperCase()} Kader`}>
      <div className="squad-list-toolbar" role="toolbar" aria-label="Position filtern">
        <button
          type="button"
          className={position === "all" ? "squad-sort-chip is-active" : "squad-sort-chip"}
          aria-pressed={position === "all"}
          onClick={() => setPosition("all")}
        >
          Alle
        </button>
        {positions.map((slot) => {
          const active = position === slot;
          return (
            <button
              key={slot}
              type="button"
              className={active ? "squad-sort-chip is-active" : "squad-sort-chip"}
              aria-pressed={active}
              onClick={() => setPosition(active ? "all" : slot)}
            >
              {slot}
            </button>
          );
        })}
      </div>

      <div className="squad-table-wrap">
        <table className="squad-table youth-roster-table">
          <thead>
            <tr>
              <th scope="col" aria-label="Details" />
              <SquadSortHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
              <SquadSortHeader label="Pos" sortKey="position" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Alt" sortKey="age" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="CA" sortKey="ca" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Δ" sortKey="caDelta" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Wert" sortKey="marketValue" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Min" sortKey="seasonMinutes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="T" sortKey="goals" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="A" sortKey="assists" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Ø" sortKey="avgRating" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="Form" sortKey="form" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <th scope="col">Ziel</th>
              <th scope="col">Fortschritt</th>
              <th scope="col">Status</th>
              <th scope="col">Region</th>
              <th scope="col">Coach</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={17} className="youth-report-empty">
                  Keine Spieler in {team === "u17" ? "der U17" : "der U19"}.
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const player = playersById.get(row.playerId);
                if (!player) return null;
                const target = youthReportTarget(player, individualPrograms, trainingPlan, week);
                const status = youthReportStatus(player, youthInbox, season, report);
                const expanded = expandedId === row.playerId;
                return (
                  <Fragment key={row.playerId}>
                    <tr
                      className={row.departureRisk ? "squad-table-row is-risk" : "squad-table-row"}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_PLAYER, row.playerId);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <td>
                        <button
                          type="button"
                          className="youth-expand-btn"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : row.playerId)}
                        >
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="squad-col-name">
                        <button type="button" className="youth-report-badge" onClick={() => onRowClick(row.playerId)}>
                          {row.departureRisk ? (
                            <Flag size={14} strokeWidth={2.5} className="youth-risk-icon" aria-hidden />
                          ) : null}
                          <PlayerPortrait seed={player.portrait_seed} size="sm" className="campus-portrait" />
                          {formatYouthReportName(player)}
                        </button>
                      </td>
                      <td>{row.position}</td>
                      <td>{row.age}</td>
                      <td className="squad-col-ca">{row.ca}</td>
                      <td className={caDeltaClassName(row.caDelta)}>
                        <span className="squad-delta-mark" aria-hidden="true">
                          {caDeltaMark(row.caDelta)}
                        </span>
                        {formatCaDelta(row.caDelta)}
                      </td>
                      <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                      <td>{row.seasonMinutes}</td>
                      <td>{row.goals}</td>
                      <td>{row.assists}</td>
                      <td>{row.avgRating?.toFixed(1) ?? "—"}</td>
                      <td className={`squad-form is-${formTone(row.form)}`}>{formMark(row.form)}</td>
                      <td>
                        <YouthTargetLabel title={target.title} />
                      </td>
                      <td>
                        {target.progress == null ? "—" : <ProgressPips value={target.progress} />}
                      </td>
                      <td>
                        <YouthStatusBadge status={status} />
                      </td>
                      <td className="youth-col-region">{row.region}</td>
                      <td className="youth-col-coach" title={coachIconLabel(row.coachIcon)}>
                        <CoachIconLucide icon={row.coachIcon} />
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="youth-expand-row">
                        <td colSpan={17}>
                          <div className="youth-expand-panel">
                            <PlayerPortrait seed={player.portrait_seed} size="md" />
                            <div>
                              <p>
                                <strong>Ziel:</strong> {target.title}
                              </p>
                              <p>
                                <strong>Status:</strong> {status.label}
                              </p>
                              <button type="button" className="negotiation-btn" onClick={() => onSelectPlayer(row.playerId)}>
                                Zum Profil
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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
            className={dropAction === action ? "youth-report-drop is-hot" : "youth-report-drop"}
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

function YouthCampsPanel({
  players,
  camps,
  masterSeed,
  cash,
  onBuy,
  onToggleStaff,
  onPull,
}: {
  players: readonly Player[];
  camps: readonly YouthCamp[];
  masterSeed: number;
  cash: number;
  onBuy: (nationId: string) => void;
  onToggleStaff: (nationId: string, staffed: boolean) => void;
  onPull: (playerId: string) => void;
}) {
  const atCampLimit = camps.length >= MAX_YOUTH_CAMPS;
  const rosterSlots = atCampLimit ? CAMP_CARD_ROSTER_SLOTS : CAMP_CARD_ROSTER_SLOTS_COMPACT;
  const nations = atCampLimit
    ? YOUTH_CAMP_NATIONS.filter((entry) => camps.some((camp) => camp.id === entry.id))
    : YOUTH_CAMP_NATIONS;

  return (
    <section className="game-panel youth-camps-grid-wrap" aria-label="Jugendcamps">
      <p className="youth-camps-meta">
        {atCampLimit
          ? `${camps.length} Camps aktiv · Unterhalt gesamt siehe Finanzen`
          : `Max. ${MAX_YOUTH_CAMPS} · Unterhalt gesamt siehe Finanzen`}
      </p>
      <ul className={`youth-camps-grid${atCampLimit ? " is-camp-roster-full" : ""}`}>
        {nations.map((entry) => (
          <li key={entry.id}>
            <YouthCampCard
              nation={entry}
              owned={camps.find((camp) => camp.id === entry.id)}
              camps={camps}
              cash={cash}
              players={players}
              masterSeed={masterSeed}
              rosterSlots={rosterSlots}
              onBuy={onBuy}
              onToggleStaff={onToggleStaff}
              onPull={onPull}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CoachIconLucide({ icon }: { icon: CoachIcon }) {
  const map: Record<CoachIcon, LucideIcon> = {
    "🚀": Rocket,
    "➡️": RefreshCw,
    "⚠️": AlertTriangle,
    "😞": Frown,
  };
  const Icon = map[icon];
  return <Icon size={16} strokeWidth={2.5} aria-hidden />;
}

function YouthStatusBadge({ status }: { status: ReturnType<typeof youthReportStatus> }) {
  const icons: Partial<Record<typeof status.kind, LucideIcon>> = {
    risk: Flag,
    contract: PenLine,
    promote: ArrowUp,
    focus: Dumbbell,
    ok: Calendar,
  };
  const Icon = icons[status.kind];
  return (
    <span className={`youth-report-status is-${status.kind}`}>
      {Icon ? <Icon size={14} strokeWidth={2.5} aria-hidden /> : null} {status.label}
    </span>
  );
}

function YouthTargetLabel({ title }: { title: string }) {
  return (
    <span className="youth-report-ziel">
      <Target size={14} strokeWidth={2.5} aria-hidden /> {title}
    </span>
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
