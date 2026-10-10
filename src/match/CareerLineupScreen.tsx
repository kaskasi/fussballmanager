/** WIREFRAME: docs/prd/design.md §9.1 — Aufstellung */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  FORMATION_IDS,
  getFormation,
  sandboxPlanFromFormation,
  type FormationId,
  type FormationSlotId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import { buildMatchConditions } from "@fussballmanager/shared";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  RefreshCw,
  Rocket,
  Save,
  Star,
  Users,
} from "lucide-react";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";
import type { Player } from "../types/player.ts";
import type { FanbaseMood } from "../stadium/fanbase.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import {
  AUTO_LINEUP_OPTIONS,
  autoLineupAssignments,
  type AutoLineupIcon,
  type AutoLineupMode,
} from "./auto-lineup.ts";
import { LineupPitch } from "./LineupPitch.tsx";
import { LineupPlayerCard } from "./LineupPlayerCard.tsx";
import {
  benchPlayers,
  buildSquadFromAssignments,
  fillMissingAssignments,
  lineupAssignmentsEqual,
  lineupSlotCount,
  normalizeMatchLineup,
  type LineupAssignments,
  type MatchLineupState,
} from "./lineup-board.ts";
import {
  loadTacticsPreset,
  type TacticsPresetId,
  type TacticsPresetSlot,
} from "./tactics-presets.ts";
import { MatchdayLineupAmbience } from "../ui/components/MatchdayLineupAmbience.tsx";
import { buildOpponentLineupPreview } from "./opponent-lineup-preview.ts";
import { clubShortName } from "../sim/league-week.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { formatLeagueMatchKickoffLabel } from "./match-kickoff-format.ts";
import { listProSquad, sortProSquadRows } from "../squad/pro-roster.ts";
import { lineupFormFromCareer } from "./lineup-player-status.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { OpponentScoutMatchAction } from "../ui/components/OpponentScoutMatchAction.tsx";
import { LineupIndicatorLegend } from "../ui/components/LineupIndicatorLegend.tsx";
import { useT } from "../i18n/react.ts";

type CareerLineupScreenProps = {
  setup: CareerMatchSetup;
  players: readonly Player[];
  week: number;
  weekday: number;
  tacticsPresets: readonly TacticsPresetSlot[];
  matchLineup: MatchLineupState | undefined;
  rivalPlayers: readonly Player[];
  onSaveTacticsPreset: (id: TacticsPresetId, plan: SandboxPlan) => void;
  onSaveMatchLineup: (lineup: MatchLineupState) => void;
  onConfirm: (squad: Squad) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
  homeStadiumCapacity?: number;
  fanbaseMood?: FanbaseMood;
  poorForm?: boolean;
  season?: number;
  scoutBoard?: ScoutBoard;
  onOpenOpponentScoutReport?: (postfachItemId: string) => void;
  onOpenPlayer?: (playerId: string) => void;
  kasse?: MatchdayCashBreakdown;
};

const TACTICS_STYLE_IDS: TacticsPresetId[] = [1, 2, 3];
/** Fixed bench rows per page — panel height stays constant (empty slots padded). */
const LINEUP_BENCH_PAGE_SIZE = 9;

export function CareerLineupScreen({
  setup,
  players,
  week,
  weekday,
  tacticsPresets,
  matchLineup,
  rivalPlayers,
  onSaveTacticsPreset,
  onSaveMatchLineup,
  onConfirm,
  onNavActionChange,
  homeStadiumCapacity,
  fanbaseMood,
  poorForm,
  season = 1,
  scoutBoard,
  onOpenOpponentScoutReport,
  onOpenPlayer,
  kasse,
}: CareerLineupScreenProps) {
  const t = useT();
  const managerClubId = careerTeamId(setup.playerClubId);
  const fallbackPlan = useMemo(() => loadTacticsPreset(tacticsPresets, 1), [tacticsPresets]);
  const [plan, setPlan] = useState<SandboxPlan>(() => matchLineup?.plan ?? fallbackPlan);
  const [activePreset, setActivePreset] = useState<TacticsPresetId | null>(matchLineup ? null : 1);
  const [activeAutoMode, setActiveAutoMode] = useState<AutoLineupMode | null>(null);
  const [assignments, setAssignments] = useState<LineupAssignments>(() =>
    normalizeMatchLineup(matchLineup, players, fallbackPlan, managerClubId).assignments,
  );
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [benchPage, setBenchPage] = useState(0);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const bench = useMemo(
    () => benchPlayers(players, assignments, managerClubId),
    [players, assignments, managerClubId],
  );
  const benchPageCount = Math.max(1, Math.ceil(bench.length / LINEUP_BENCH_PAGE_SIZE));

  useEffect(() => {
    setBenchPage((current) => Math.min(current, benchPageCount - 1));
  }, [benchPageCount]);

  useEffect(() => {
    const normalized = normalizeMatchLineup(matchLineup, players, fallbackPlan, managerClubId);
    setPlan((current) =>
      current.formation === normalized.plan.formation &&
      current.mentality === normalized.plan.mentality &&
      current.pressing === normalized.plan.pressing &&
      current.lineHeight === normalized.plan.lineHeight
        ? current
        : normalized.plan,
    );
    setAssignments((current) =>
      lineupAssignmentsEqual(current, normalized.assignments) ? current : normalized.assignments,
    );
    setActivePreset(matchLineup ? null : 1);
  }, [matchLineup, players, fallbackPlan, managerClubId]);

  const benchPageSlots = useMemo(() => {
    const start = benchPage * LINEUP_BENCH_PAGE_SIZE;
    const slice = bench.slice(start, start + LINEUP_BENCH_PAGE_SIZE);
    return Array.from({ length: LINEUP_BENCH_PAGE_SIZE }, (_, index) => slice[index] ?? null);
  }, [bench, benchPage]);
  const opponentPreview = useMemo(
    () => buildOpponentLineupPreview(setup, rivalPlayers),
    [setup, rivalPlayers],
  );
  const playerTeamLabel = clubShortName(setup.playerClubId);
  const filledCount = lineupSlotCount(assignments, plan.formation);
  const squadTableRows = useMemo(() => {
    const assigned = new Set(Object.values(assignments).filter(Boolean));
    const rows = listProSquad(players, managerClubId);
    return sortProSquadRows(rows, "position", "asc").map((row) => ({
      ...row,
      role: assigned.has(row.playerId) ? ("start" as const) : ("bench" as const),
    }));
  }, [players, managerClubId, assignments]);
  const squad = useMemo(
    () => buildSquadFromAssignments(players, plan, assignments, setup.playerClubId, managerClubId),
    [players, plan, assignments, setup.playerClubId, managerClubId],
  );

  const persistLineup = useCallback(
    (nextAssignments: LineupAssignments, nextPlan: SandboxPlan) => {
      onSaveMatchLineup({
        formation: nextPlan.formation,
        plan: nextPlan,
        assignments: nextAssignments,
      });
    },
    [onSaveMatchLineup],
  );

  const setSlot = useCallback(
    (slotId: FormationSlotId, playerId: string | null) => {
      setAssignments((current) => {
        const next = { ...current };
        if (playerId) {
          for (const [slot, id] of Object.entries(next)) {
            if (id === playerId) delete next[slot as FormationSlotId];
          }
          next[slotId] = playerId;
        } else {
          delete next[slotId];
        }
        persistLineup(next, plan);
        return next;
      });
    },
    [persistLineup, plan],
  );

  const unassignPlayer = useCallback(
    (playerId: string) => {
      setAssignments((current) => {
        const next = { ...current };
        for (const slot of getFormation(plan.formation)) {
          if (next[slot.id] === playerId) {
            delete next[slot.id];
          }
        }
        persistLineup(next, plan);
        return next;
      });
    },
    [persistLineup, plan],
  );

  const applyAuto = useCallback(
    (mode: AutoLineupMode) => {
      const next = autoLineupAssignments(players, plan.formation, mode, managerClubId);
      setActiveAutoMode(mode);
      setAssignments(next);
      persistLineup(next, plan);
    },
    [players, plan, persistLineup, managerClubId],
  );

  const changeFormation = useCallback(
    (formation: FormationId) => {
      const nextPlan = sandboxPlanFromFormation(formation);
      setActivePreset(null);
      setPlan(nextPlan);
      const nextAssignments = fillMissingAssignments(players, formation, {}, managerClubId);
      setAssignments(nextAssignments);
      persistLineup(nextAssignments, nextPlan);
    },
    [players, persistLineup, managerClubId],
  );

  const applyStylePreset = useCallback(
    (presetId: TacticsPresetId) => {
      const loaded = loadTacticsPreset(tacticsPresets, presetId);
      const next = {
        ...plan,
        mentality: loaded.mentality,
        pressing: loaded.pressing,
        lineHeight: loaded.lineHeight,
      };
      setPlan(next);
      setActivePreset(presetId);
      persistLineup(assignments, next);
    },
    [assignments, persistLineup, plan, tacticsPresets],
  );

  useLayoutEffect(() => {
    if (!squad || filledCount < 11) {
      onNavActionChange(null);
      return;
    }
    onNavActionChange({
      label: t("match.lineup.confirmSelection"),
      onClick: () => {
        onConfirm(squad);
      },
      title: t("match.lineup.confirmSelectionTitle"),
    });
    return () => onNavActionChange(null);
  }, [squad, filledCount, onConfirm, onNavActionChange, t]);

  if (!squad) {
    return (
      <main className="matchday career-lineup">
        <p className="status error">{t("match.lineup.noSquad")}</p>
      </main>
    );
  }

  const matchdayLabel = setup.isHome ? t("match.career.side.home") : t("match.career.side.away");
  const matchConditions = buildMatchConditions(setup.seed);
  const kickoffLabel = formatLeagueMatchKickoffLabel(season, week, weekday);
  const capacity = homeStadiumCapacity ?? 8_000;
  const occupancy = kasse?.occupancy ?? (setup.isHome ? 0.72 : 0.06);
  const expectedSpectators = setup.isHome
    ? Math.round(capacity * occupancy)
    : Math.round(12_000 + (setup.seed % 9_000));

  return (
    <main className="matchday career-lineup">
      <MatchdayLineupAmbience
        setup={setup}
        homeStadiumCapacity={homeStadiumCapacity}
        fanbaseMood={fanbaseMood}
        poorForm={poorForm}
      />
      <section className="career-lineup-panel" aria-label={t("match.lineup.title")}>
        <header className="career-lineup-header">
          <div className="career-lineup-header-main">
            <h1>{t("match.lineup.title")}</h1>
          </div>
        </header>

        <div className="career-lineup-hero">
          <div
            className="career-lineup-toolbar-row"
            aria-label={t("match.lineup.autoPickAria")}
          >
            <div className="career-lineup-pills">
              {AUTO_LINEUP_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  className={
                    activeAutoMode === option.mode ? "career-lineup-pill is-active" : "career-lineup-pill"
                  }
                  title={t(option.titleKey)}
                  onClick={() => applyAuto(option.mode)}
                >
                  <AutoLineupIcon kind={option.icon} />
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
            <label className="career-lineup-pill career-lineup-formation-pill">
              <span className="career-lineup-formation-pill-label">{t("match.lineup.formation")}</span>
              <span className="career-lineup-formation-pill-value">
                <select
                  value={plan.formation}
                  aria-label={t("match.lineup.formation")}
                  onChange={(event) => changeFormation(event.target.value as FormationId)}
                >
                  {FORMATION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} strokeWidth={2.5} aria-hidden />
              </span>
            </label>
          </div>

          <div className="career-lineup-board">
            <div className="lineup-pitch-panel game-panel-inner">
              <LineupPitch
                formation={plan.formation}
                assignments={assignments}
                playersById={playersById}
                dragPlayerId={dragPlayerId}
                playerTeamLabel={playerTeamLabel}
                opponent={opponentPreview}
                onAssign={setSlot}
                onDragPlayer={setDragPlayerId}
                onOpenPlayer={onOpenPlayer}
              />
              {scoutBoard && onOpenOpponentScoutReport ? (
                <OpponentScoutMatchAction
                  mode="lineup"
                  setup={setup}
                  season={season}
                  scoutBoard={scoutBoard}
                  onViewReport={onOpenOpponentScoutReport}
                />
              ) : null}
            </div>
            <aside className="lineup-bench" aria-label={t("match.lineup.benchAria")}>
              <div className="lineup-bench-head">
                <h2 className="lineup-bench-title">{t("match.lineup.benchTitle", { count: bench.length })}</h2>
                {benchPageCount > 1 ? (
                  <div className="lineup-bench-pager" aria-label={t("match.lineup.benchPagerAria")}>
                    <button
                      type="button"
                      className="lineup-bench-pager-btn"
                      disabled={benchPage <= 0}
                      title={t("match.lineup.benchPrev")}
                      onClick={() => setBenchPage((page) => Math.max(0, page - 1))}
                    >
                      <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
                      <span className="sr-only">{t("match.lineup.benchPrev")}</span>
                    </button>
                    <span className="lineup-bench-pager-label">
                      {t("match.lineup.benchPage", { page: benchPage + 1, pages: benchPageCount })}
                    </span>
                    <button
                      type="button"
                      className="lineup-bench-pager-btn"
                      disabled={benchPage >= benchPageCount - 1}
                      title={t("match.lineup.benchNext")}
                      onClick={() =>
                        setBenchPage((page) => Math.min(benchPageCount - 1, page + 1))
                      }
                    >
                      <ChevronRight size={16} strokeWidth={2.5} aria-hidden />
                      <span className="sr-only">{t("match.lineup.benchNext")}</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <LineupIndicatorLegend />
              <div
                className="lineup-bench-list lineup-bench-list--fixed"
                onDragOver={(event) => {
                  if (dragPlayerId) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const playerId = event.dataTransfer.getData("text/player-id");
                  if (!playerId) return;
                  if (Object.values(assignments).includes(playerId)) {
                    unassignPlayer(playerId);
                  }
                  setDragPlayerId(null);
                }}
              >
                {benchPageSlots.map((player, index) =>
                  player ? (
                    <LineupPlayerCard
                      key={player.id}
                      player={player}
                      onDragStart={setDragPlayerId}
                      onDragEnd={() => setDragPlayerId(null)}
                      onOpenPlayer={onOpenPlayer}
                    />
                  ) : (
                    <div
                      key={`bench-empty-${benchPage}-${index}`}
                      className="lineup-bench-slot lineup-bench-slot--empty"
                      aria-hidden
                    />
                  ),
                )}
              </div>
            </aside>
          </div>

          <aside className="career-lineup-context" aria-label={t("match.lineup.contextAria")}>
            <article className="lineup-opponent-card">
              <h2>{opponentPreview?.teamShortName ?? setup.opponentShortName}</h2>
              <p className="lineup-opponent-meta">
                {opponentPreview?.formation ?? "—"} · {matchdayLabel}
              </p>
              <p className="lineup-opponent-meta">{t("match.lineup.vs", { opponent: setup.opponentShortName })}</p>
              <ul className="lineup-match-facts">
                <li>
                  <CalendarDays size={15} strokeWidth={2.25} aria-hidden />
                  <span>{t("match.lineup.matchday", { matchday: setup.matchday })}</span>
                </li>
                <li>
                  <Calendar size={15} strokeWidth={2.25} aria-hidden />
                  <span>{kickoffLabel}</span>
                </li>
                <li>
                  <CloudSun size={15} strokeWidth={2.25} aria-hidden />
                  <span>{matchConditions.weather}</span>
                </li>
                <li>
                  <Users size={15} strokeWidth={2.25} aria-hidden />
                  <span>
                    {t("match.lineup.spectators", {
                      count: expectedSpectators.toLocaleString("de-DE"),
                    })}
                  </span>
                </li>
              </ul>
            </article>

            <article className="lineup-tactics-card lineup-tactics-card--stretch">
              <h2>{t("match.lineup.tactics")}</h2>
              <div className="lineup-tactics-pills" role="group" aria-label={t("match.lineup.playStyleAria")}>
                {TACTICS_STYLE_IDS.map((presetId) => {
                  const preset = tacticsPresets.find((entry) => entry.id === presetId);
                  const label = preset?.label ?? `Preset ${presetId}`;
                  return (
                    <div key={presetId} className="lineup-tactics-pill-row">
                      <button
                        type="button"
                        className={
                          activePreset === presetId
                            ? "lineup-tactics-pill is-active"
                            : "lineup-tactics-pill"
                        }
                        onClick={() => applyStylePreset(presetId)}
                      >
                        {label}
                      </button>
                      <button
                        type="button"
                        className="lineup-tactics-save"
                        title={t("match.lineup.savePresetTitle", { label })}
                        onClick={() => {
                          onSaveTacticsPreset(presetId, plan);
                          setActivePreset(presetId);
                        }}
                      >
                        <Save size={16} strokeWidth={2.5} aria-hidden />
                        <span className="sr-only">{t("match.lineup.savePresetSr")}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="lineup-tactics-score">
                {plan.mentality} / {plan.pressing} / {plan.lineHeight}
              </p>
            </article>

            <details className="career-lineup-disclosure">
              <summary>{t("match.lineup.fineTuning")}</summary>
              <div className="career-lineup-toolbar">
                <TacticSlider
                  label={t("match.lineup.slider.mentalityShort")}
                  value={plan.mentality}
                  onChange={(mentality) => {
                    setActivePreset(null);
                    const next = { ...plan, mentality };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label={t("match.lineup.slider.pressingShort")}
                  value={plan.pressing}
                  onChange={(pressing) => {
                    setActivePreset(null);
                    const next = { ...plan, pressing };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label={t("match.lineup.slider.lineShort")}
                  value={plan.lineHeight}
                  min={25}
                  max={90}
                  onChange={(lineHeight) => {
                    setActivePreset(null);
                    const next = { ...plan, lineHeight };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
              </div>
            </details>
          </aside>
        </div>

        {filledCount < 11 ? (
          <p className="career-lineup-warning" role="status">
            {t("match.lineup.slotsOpen", { count: 11 - filledCount })}
          </p>
        ) : null}

        <details className="career-lineup-disclosure career-lineup-squad">
          <summary>{t("match.lineup.squadSummary", { count: squadTableRows.length })}</summary>
          <div className="career-lineup-squad-body">
            <table className="lineup-squad-table">
              <thead>
                <tr>
                  <th scope="col">{t("squad.col.pos")}</th>
                  <th scope="col">{t("squad.col.name")}</th>
                  <th scope="col" className="col-num">
                    {t("squad.col.age")}
                  </th>
                  <th scope="col" className="col-num">
                    CA
                  </th>
                  <th scope="col" className="col-num">
                    {t("match.lineup.col.form")}
                  </th>
                  <th scope="col" className="col-role">
                    {t("match.lineup.col.usage")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {squadTableRows.map((row) => {
                  const form = lineupFormFromCareer(row.form);
                  return (
                    <tr key={row.playerId} className={row.role === "start" ? "is-starter" : undefined}>
                      <td className="col-pos">{row.position}</td>
                      <td className="col-name">
                        {onOpenPlayer ? (
                          <button
                            type="button"
                            className="lineup-squad-name-btn"
                            onClick={() => onOpenPlayer(row.playerId)}
                          >
                            {row.displayName}
                          </button>
                        ) : (
                          row.displayName
                        )}
                      </td>
                      <td className="col-num">{row.age}</td>
                      <td className="col-num">{row.ca}</td>
                      <td className={`lineup-squad-form col-num is-${form.tone}`}>{form.label}</td>
                      <td className="col-role">
                        <span className={`lineup-squad-role is-${row.role}`}>
                          {row.role === "start" ? t("match.lineup.role.start") : t("match.lineup.role.bench")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </main>
  );
}

function AutoLineupIcon({ kind }: { kind: AutoLineupIcon }) {
  const props = { size: 16, strokeWidth: 2.5, "aria-hidden": true as const };
  switch (kind) {
    case "star":
      return <Star {...props} />;
    case "refresh":
      return <RefreshCw {...props} />;
    case "rocket":
      return <Rocket {...props} />;
  }
}

function TacticSlider({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="career-lineup-slider">
      {label} {value}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

