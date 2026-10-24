/** WIREFRAME: docs/prd/design.md §9.1 — Aufstellung */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { TacticsMode } from "../narrative/career-presentation.ts";
import {
  FORMATION_IDS,
  getFormation,
  sandboxPlanFromFormation,
  type FormationId,
  type FormationSlotId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Rocket,
  Save,
  Star,
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
import { getLocale } from "../i18n/index.ts";
import { localeBcp47 } from "../i18n/locale-id.ts";
import { formatLeagueMatchKickoffLabel } from "./match-kickoff-format.ts";
import { formatMatchWeatherDisplay } from "./match-weather-display.ts";
import { listProSquad, sortProSquadRows } from "../squad/pro-roster.ts";
import { lineupFormFromCareer } from "./lineup-player-status.ts";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import { stateMark } from "../ui/player-profile.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { OpponentScoutMatchAction } from "../ui/components/OpponentScoutMatchAction.tsx";
import { OpponentScoutInboxCard } from "../ui/components/OpponentScoutInboxCard.tsx";
import type { ScoutNetworkState } from "../scouting/scout-network.ts";
import { opponentScoutMatchIdFromSetup } from "../scouting/opponent-scout-match-id.ts";
import { opponentScoutNoticeForMatch } from "../scouting/scout-job-postfach.ts";
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
  /** PRD 19 Act 1 — formation only, no presets or sliders. */
  tacticsMode?: TacticsMode;
  /** PRD 19 — opponent scout module behind the Story Mode curtain. */
  showOpponentScout?: boolean;
  /**
   * "match": pre-kickoff step of the match flow (confirm button in the header NEXT).
   * "menu": standalone Tactics screen — edits persist, no kickoff, analysis panel inline.
   */
  variant?: "match" | "menu";
  scoutNetwork?: ScoutNetworkState;
  onStartOpponentScout?: () => void;
  onApplyOpponentScoutPlan?: (plan: SandboxPlan) => void;
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
  tacticsMode = "full",
  showOpponentScout = true,
  variant = "match",
  scoutNetwork,
  onStartOpponentScout,
  onApplyOpponentScoutPlan,
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
  // The Tactics screen shows the whole bench as a tile grid; the match flow pages a fixed-height list.
  const benchPageSize = variant === "menu" ? Math.max(bench.length, 1) : LINEUP_BENCH_PAGE_SIZE;
  const benchPageCount = Math.max(1, Math.ceil(bench.length / benchPageSize));

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
    const start = benchPage * benchPageSize;
    const slice = bench.slice(start, start + benchPageSize);
    if (variant === "menu") return slice;
    return Array.from({ length: benchPageSize }, (_, index) => slice[index] ?? null);
  }, [bench, benchPage, benchPageSize, variant]);
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

  const analysisNotice = useMemo(
    () =>
      scoutBoard
        ? opponentScoutNoticeForMatch(scoutBoard, opponentScoutMatchIdFromSetup(season, setup))
        : undefined,
    [scoutBoard, season, setup],
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
    if (variant === "menu") return;
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
  }, [squad, filledCount, onConfirm, onNavActionChange, t, variant]);

  if (!squad) {
    return (
      <main className="matchday career-lineup">
        <p className="status error">{t("match.lineup.noSquad")}</p>
      </main>
    );
  }

  const matchdayLabel = setup.isHome ? t("match.career.side.home") : t("match.career.side.away");
  const weatherLabel = formatMatchWeatherDisplay(setup.seed);
  const kickoffLabel = formatLeagueMatchKickoffLabel(season, week, weekday);
  const numberFormat = localeBcp47(getLocale());
  const capacity = homeStadiumCapacity ?? 8_000;
  const occupancy = kasse?.occupancy ?? (setup.isHome ? 0.72 : 0.06);
  const expectedSpectators = setup.isHome
    ? Math.round(capacity * occupancy)
    : Math.round(12_000 + (setup.seed % 9_000));

  return (
    <main className={`matchday career-lineup tc-lineup${variant === "menu" ? " tc-lineup--menu club-shell-card-body" : ""}`}>
      {variant === "menu" ? null : (
      <MatchdayLineupAmbience
        setup={setup}
        homeStadiumCapacity={homeStadiumCapacity}
        fanbaseMood={fanbaseMood}
        poorForm={poorForm}
      />
      )}
      <header className="tc-page-head tc-lineup__head">
        <div className="tc-lineup__title">
          <h1 className="tc-page-title">{t("match.lineup.title")}</h1>
          <p className="tc-page-sub">
            {t("match.lineup.matchday", { matchday: setup.matchday })} · {matchdayLabel}{" "}
            {t("match.lineup.vs", { opponent: setup.opponentShortName })} · {kickoffLabel}
          </p>
        </div>
        <div className="tc-lineup__tools">
          <div className="tc-chips" role="group" aria-label={t("match.lineup.autoPickAria")}>
            {AUTO_LINEUP_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                className="tc-chip tc-chip--icon"
                aria-pressed={activeAutoMode === option.mode}
                title={t(option.titleKey)}
                onClick={() => applyAuto(option.mode)}
              >
                <AutoLineupIcon kind={option.icon} />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <label className="tc-lineup__formation">
            <span className="tc-label">{t("match.lineup.formation")}</span>
            <select
              className="tc-select tc-lineup__select"
              value={plan.formation}
              onChange={(event) => changeFormation(event.target.value as FormationId)}
            >
              {FORMATION_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {filledCount < 11 ? (
        <p className="tc-callout tc-callout--warn tc-lineup__warning" role="status">
          {t("match.lineup.slotsOpen", { count: 11 - filledCount })}
        </p>
      ) : null}

      <div className="tc-split tc-lineup__split">
        <div className="tc-lineup__board">
          <section className="tc-panel tc-lineup__pitch lineup-pitch-panel" aria-label={t("match.lineup.pitchViewAria")}>
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
              orientation={variant === "menu" ? "vertical" : "horizontal"}
            />
            {variant === "match" && showOpponentScout && scoutBoard && onOpenOpponentScoutReport ? (
              <OpponentScoutMatchAction
                mode="lineup"
                setup={setup}
                season={season}
                scoutBoard={scoutBoard}
                onViewReport={onOpenOpponentScoutReport}
              />
            ) : null}
          </section>
          <aside className="tc-panel tc-lineup__bench lineup-bench" aria-label={t("match.lineup.benchAria")}>
            <div className="tc-panel__head tc-lineup__bench-head">
              <h2 className="tc-label">{t("match.lineup.benchTitle", { count: bench.length })}</h2>
              {benchPageCount > 1 ? (
                <div className="tc-lineup__pager" role="group" aria-label={t("match.lineup.benchPagerAria")}>
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={benchPage <= 0}
                    title={t("match.lineup.benchPrev")}
                    onClick={() => setBenchPage((page) => Math.max(0, page - 1))}
                  >
                    <ChevronLeft className="tc-icon" strokeWidth={2.5} aria-hidden />
                    <span className="tc-sr">{t("match.lineup.benchPrev")}</span>
                  </button>
                  <span className="tc-caption">
                    {t("match.lineup.benchPage", { page: benchPage + 1, pages: benchPageCount })}
                  </span>
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={benchPage >= benchPageCount - 1}
                    title={t("match.lineup.benchNext")}
                    onClick={() => setBenchPage((page) => Math.min(benchPageCount - 1, page + 1))}
                  >
                    <ChevronRight className="tc-icon" strokeWidth={2.5} aria-hidden />
                    <span className="tc-sr">{t("match.lineup.benchNext")}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <LineupIndicatorLegend />
            <div
              className={`lineup-bench-list ${variant === "menu" ? "lineup-bench-grid" : "lineup-bench-list--fixed"}`}
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
                    tile={variant === "menu"}
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

        <aside className="tc-stack" aria-label={t("match.lineup.contextAria")}>
          <section className="tc-panel">
            <div className="tc-panel__head">
              <div>
                <p className="tc-label">{t("match.lineup.opponent")}</p>
                <h2 className="tc-panel__title">{opponentPreview?.teamShortName ?? setup.opponentShortName}</h2>
              </div>
              <span className="tc-panel__meta">{opponentPreview?.formation ?? "—"}</span>
            </div>
            <dl className="tc-kv">
              <dt>{t("match.lineup.fact.venue")}</dt>
              <dd>{matchdayLabel}</dd>
              <dt>{t("match.lineup.fact.kickoff")}</dt>
              <dd>{kickoffLabel}</dd>
              <dt>{t("match.lineup.fact.weather")}</dt>
              <dd>{weatherLabel}</dd>
              <dt>{t("match.lineup.fact.spectators")}</dt>
              <dd>~{expectedSpectators.toLocaleString(numberFormat)}</dd>
            </dl>
          </section>

          {variant === "menu" && showOpponentScout && scoutBoard ? (
            <section className="tc-panel tc-lineup__analysis" aria-label={t("tactics.analysis.title")}>
              <div className="tc-panel__head">
                <h2 className="tc-panel__title">{t("tactics.analysis.title")}</h2>
              </div>
              {analysisNotice ? (
                <OpponentScoutInboxCard
                  notice={analysisNotice}
                  postIndex={1}
                  postTotal={1}
                  onDismiss={() => undefined}
                  onApplyPlan={tacticsMode === "full" ? onApplyOpponentScoutPlan : undefined}
                  embedded
                  readOnly
                  hidePostCount
                />
              ) : (
                <OpponentScoutMatchAction
                  setup={setup}
                  season={season}
                  scoutBoard={scoutBoard}
                  scoutNetwork={scoutNetwork}
                  onStart={onStartOpponentScout}
                />
              )}
            </section>
          ) : null}

          {tacticsMode === "full" ? (
          <section className="tc-panel">
            <div className="tc-panel__head">
              <h2 className="tc-panel__title">{t("match.lineup.tactics")}</h2>
              <span className="tc-panel__meta tc-lineup__score">
                {plan.mentality} / {plan.pressing} / {plan.lineHeight}
              </span>
            </div>
            <ul className="tc-lineup__presets" aria-label={t("match.lineup.playStyleAria")}>
              {TACTICS_STYLE_IDS.map((presetId) => {
                const label = t(`match.tactics.preset.${presetId}`);
                return (
                  <li key={presetId}>
                    <button
                      type="button"
                      className="tc-chip"
                      aria-pressed={activePreset === presetId}
                      onClick={() => applyStylePreset(presetId)}
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      className="tc-iconbtn"
                      title={t("match.lineup.savePresetTitle", { label })}
                      onClick={() => {
                        onSaveTacticsPreset(presetId, plan);
                        setActivePreset(presetId);
                      }}
                    >
                      <Save className="tc-icon" strokeWidth={2.25} aria-hidden />
                      <span className="tc-sr">{t("match.lineup.savePresetSr")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <details className="tc-lineup__tuning">
              <summary className="tc-label">{t("match.lineup.fineTuning")}</summary>
              <div className="tc-lineup__ranges">
                <TacticSlider
                  label={t("match.lineup.slider.mentality")}
                  value={plan.mentality}
                  onChange={(mentality) => {
                    setActivePreset(null);
                    const next = { ...plan, mentality };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label={t("match.lineup.slider.pressing")}
                  value={plan.pressing}
                  onChange={(pressing) => {
                    setActivePreset(null);
                    const next = { ...plan, pressing };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label={t("match.lineup.slider.line")}
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
          </section>
          ) : null}
        </aside>
      </div>

      {variant === "menu" ? null : (
      <section className="tc-panel tc-lineup__squad" aria-label={t("match.lineup.squadAria")}>
        <div className="tc-panel__head">
          <h2 className="tc-panel__title">{t("match.lineup.squadSummary", { count: squadTableRows.length })}</h2>
          <span className="tc-panel__meta">{t("match.lineup.startersMeta", { count: filledCount })}</span>
        </div>
        <div className="tc-table-wrap">
          <table className="tc-table tc-table--compact">
            <thead>
              <tr>
                <th scope="col">{t("squad.col.pos")}</th>
                <th scope="col">{t("squad.col.name")}</th>
                <th scope="col" className="tc-num">
                  {t("squad.col.age")}
                </th>
                <th scope="col" className="tc-num">
                  CA
                </th>
                <th scope="col" className="tc-num">
                  {t("match.lineup.col.form")}
                </th>
                <th scope="col" className="tc-num">
                  {t("match.lineup.col.fitness")}
                </th>
                <th scope="col">{t("match.lineup.col.usage")}</th>
              </tr>
            </thead>
            <tbody>
              {squadTableRows.map((row) => {
                const form = lineupFormFromCareer(row.form);
                const fit = stateMark(row.fitness, 75, 50);
                return (
                  <tr key={row.playerId} className={row.role === "start" ? "tc-row--mark" : undefined}>
                    <td>{row.positionLabel}</td>
                    <td>
                      {onOpenPlayer ? (
                        <button type="button" className="tc-linkbtn" onClick={() => onOpenPlayer(row.playerId)}>
                          {row.displayName}
                        </button>
                      ) : (
                        row.displayName
                      )}
                    </td>
                    <td className="tc-num">{row.age}</td>
                    <td className="tc-num">{row.ca}</td>
                    <td className={`tc-num tc-state--${form.tone}`}>{form.label}</td>
                    <td className={`tc-num tc-state--${fit.tone}`}>
                      <span className="tc-lineup__fit">
                        <LineupFatigueBars fitness={row.fitness} compact />
                        <span aria-hidden>{fit.mark}</span>
                        {row.fitness}
                      </span>
                    </td>
                    <td>
                      <span className={`tc-lineup__role${row.role === "start" ? " is-start" : ""}`}>
                        {row.role === "start" ? t("match.lineup.role.start") : t("match.lineup.role.bench")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </main>
  );
}

function AutoLineupIcon({ kind }: { kind: AutoLineupIcon }) {
  const props = { className: "tc-icon", strokeWidth: 2.5, "aria-hidden": true as const };
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
    <label className="tc-range">
      <span className="tc-range__head">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
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

