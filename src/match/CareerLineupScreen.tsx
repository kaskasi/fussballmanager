/** WIREFRAME: docs/prd/design.md §9.1 — Aufstellung */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  FORMATION_IDS,
  sandboxPlanFromFormation,
  type FormationId,
  type FormationSlotId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import { RefreshCw, Rocket, Save, Star } from "lucide-react";
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
import { formatCalendarWeek } from "../sim/game-calendar.ts";
import { listProSquad, sortProSquadRows } from "../squad/pro-roster.ts";
import { formMark } from "../ui/player-profile.ts";

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
};

const TACTICS_STYLE_IDS: TacticsPresetId[] = [1, 2, 3];

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
}: CareerLineupScreenProps) {
  const managerClubId = careerTeamId(setup.playerClubId);
  const fallbackPlan = useMemo(() => loadTacticsPreset(tacticsPresets, 1), [tacticsPresets]);
  const [plan, setPlan] = useState<SandboxPlan>(() => matchLineup?.plan ?? fallbackPlan);
  const [activePreset, setActivePreset] = useState<TacticsPresetId | null>(matchLineup ? null : 1);
  const [activeAutoMode, setActiveAutoMode] = useState<AutoLineupMode | null>(null);
  const [assignments, setAssignments] = useState<LineupAssignments>(() =>
    normalizeMatchLineup(matchLineup, players, fallbackPlan, managerClubId).assignments,
  );
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const bench = useMemo(
    () => benchPlayers(players, assignments, managerClubId),
    [players, assignments, managerClubId],
  );
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
      role: assigned.has(row.playerId) ? "Start" : "Bank",
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
      label: "Auswahl bestätigen",
      onClick: () => {
        onConfirm(squad);
      },
      title: "Startelf übernehmen — Simulation startest du im nächsten Schritt",
    });
    return () => onNavActionChange(null);
  }, [squad, filledCount, onConfirm, onNavActionChange]);

  if (!squad) {
    return (
      <main className="matchday career-lineup">
        <p className="status error">Kein Profikader für die Aufstellung verfügbar.</p>
      </main>
    );
  }

  const matchdayLabel = setup.isHome ? "Heim" : "Auswärts";

  return (
    <main className="matchday career-lineup">
      <MatchdayLineupAmbience
        setup={setup}
        homeStadiumCapacity={homeStadiumCapacity}
        fanbaseMood={fanbaseMood}
        poorForm={poorForm}
      />
      <section className="career-lineup-panel" aria-label="Aufstellung">
        <header className="career-lineup-header">
          <div className="career-lineup-header-main">
            <h1>Aufstellung</h1>
            <p className="career-lineup-sub">
              {filledCount}/11 · {formatCalendarWeek(week)} {weekdayLabel(weekday)}
            </p>
          </div>
          <label className="career-lineup-formation career-lineup-formation--inline">
            Formation
            <select
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
        </header>

        <div className="career-lineup-pills" aria-label="Schnellwahl">
          {AUTO_LINEUP_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              className={
                activeAutoMode === option.mode ? "career-lineup-pill is-active" : "career-lineup-pill"
              }
              title={option.title}
              onClick={() => applyAuto(option.mode)}
            >
              <AutoLineupIcon kind={option.icon} />
              {option.label}
            </button>
          ))}
        </div>

        <div className="career-lineup-hero">
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
              />
            </div>
            <aside className="lineup-bench" aria-label="Ersatzbank">
              <h2 className="lineup-bench-title">Bank · {bench.length}</h2>
              <p className="lineup-bench-hint">Ziehen · Form/Fit · WA</p>
              <div className="lineup-bench-list">
                {bench.map((player) => (
                  <LineupPlayerCard
                    key={player.id}
                    player={player}
                    onDragStart={setDragPlayerId}
                    onDragEnd={() => setDragPlayerId(null)}
                  />
                ))}
              </div>
            </aside>
          </div>

          <aside className="career-lineup-context" aria-label="Gegner und Taktik">
            <article className="lineup-opponent-card">
              <h2>{opponentPreview?.teamShortName ?? setup.opponentShortName}</h2>
              <p className="lineup-opponent-meta">
                {opponentPreview?.formation ?? "—"} · Spieltag {setup.matchday} · {matchdayLabel}
              </p>
              <p className="lineup-opponent-meta">vs {setup.opponentShortName}</p>
            </article>

            <article className="lineup-tactics-card">
              <h2>Taktik</h2>
              <div className="lineup-tactics-pills" role="group" aria-label="Spielstil">
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
                        title={`Aktuelle Taktik in „${label}“ speichern`}
                        onClick={() => {
                          onSaveTacticsPreset(presetId, plan);
                          setActivePreset(presetId);
                        }}
                      >
                        <Save size={16} strokeWidth={2.5} aria-hidden />
                        <span className="sr-only">Speichern</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="lineup-tactics-score">
                {plan.mentality} / {plan.pressing} / {plan.lineHeight}
              </p>
            </article>

            <details className="career-lineup-tactics">
              <summary>Feintuning</summary>
              <div className="career-lineup-toolbar">
                <TacticSlider
                  label="Men"
                  value={plan.mentality}
                  onChange={(mentality) => {
                    setActivePreset(null);
                    const next = { ...plan, mentality };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label="Prs"
                  value={plan.pressing}
                  onChange={(pressing) => {
                    setActivePreset(null);
                    const next = { ...plan, pressing };
                    setPlan(next);
                    persistLineup(assignments, next);
                  }}
                />
                <TacticSlider
                  label="Lin"
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
            Noch {11 - filledCount} Position{11 - filledCount === 1 ? "" : "en"} offen — Auto-Aufstellung oder
            Spieler ziehen.
          </p>
        ) : null}

        <section className="lineup-squad-table-wrap game-panel" aria-label="Kaderübersicht">
          <h2 className="lineup-squad-table-title">Kader</h2>
          <table className="lineup-squad-table">
            <thead>
              <tr>
                <th scope="col">Pos</th>
                <th scope="col">Name</th>
                <th scope="col">Alter</th>
                <th scope="col">CA</th>
                <th scope="col">Form</th>
                <th scope="col">Einsatz</th>
              </tr>
            </thead>
            <tbody>
              {squadTableRows.map((row) => {
                const form = formMark(row.form);
                return (
                  <tr key={row.playerId}>
                    <td>{row.position}</td>
                    <td>{row.displayName}</td>
                    <td>{row.age}</td>
                    <td>{row.ca}</td>
                    <td className={`lineup-squad-form is-${form.tone}`}>
                      <span aria-hidden="true">{form.mark}</span> {row.form.toFixed(2)}
                    </td>
                    <td>{row.role}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
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

function weekdayLabel(weekday: number): string {
  return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][weekday - 1] ?? "—";
}
