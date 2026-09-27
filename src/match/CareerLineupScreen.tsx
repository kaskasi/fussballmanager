/** WIREFRAME: PRD 09.2 — F1.1 Drag&Drop + F1.3 Auto-Aufstellung */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FORMATION_IDS,
  sandboxPlanFromFormation,
  type FormationId,
  type FormationSlotId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { AUTO_LINEUP_OPTIONS, autoLineupAssignments } from "./auto-lineup.ts";
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

type CareerLineupScreenProps = {
  setup: CareerMatchSetup;
  players: readonly Player[];
  week: number;
  weekday: number;
  tacticsPresets: readonly TacticsPresetSlot[];
  matchLineup: MatchLineupState | undefined;
  onSaveTacticsPreset: (id: TacticsPresetId, plan: SandboxPlan) => void;
  onSaveMatchLineup: (lineup: MatchLineupState) => void;
  onConfirm: (squad: Squad) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
};

export function CareerLineupScreen({
  setup,
  players,
  week,
  weekday,
  tacticsPresets,
  matchLineup,
  onSaveTacticsPreset,
  onSaveMatchLineup,
  onConfirm,
  onNavActionChange,
}: CareerLineupScreenProps) {
  const fallbackPlan = useMemo(() => loadTacticsPreset(tacticsPresets, 1), [tacticsPresets]);
  const [plan, setPlan] = useState<SandboxPlan>(() => matchLineup?.plan ?? fallbackPlan);
  const [activePreset, setActivePreset] = useState<TacticsPresetId | null>(matchLineup ? null : 1);
  const [assignments, setAssignments] = useState<LineupAssignments>(() =>
    normalizeMatchLineup(matchLineup, players, fallbackPlan).assignments,
  );
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const bench = useMemo(() => benchPlayers(players, assignments), [players, assignments]);
  const filledCount = lineupSlotCount(assignments, plan.formation);
  const squad = useMemo(
    () => buildSquadFromAssignments(players, plan, assignments),
    [players, plan, assignments],
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
    [plan, persistLineup],
  );

  const applyAuto = useCallback(
    (mode: "best_eleven" | "rotation" | "youth") => {
      const next = autoLineupAssignments(players, plan.formation, mode);
      setAssignments(next);
      persistLineup(next, plan);
    },
    [players, plan, persistLineup],
  );

  const changeFormation = useCallback(
    (formation: FormationId) => {
      const nextPlan = sandboxPlanFromFormation(formation);
      setActivePreset(null);
      setPlan(nextPlan);
      const nextAssignments = fillMissingAssignments(players, formation, {});
      setAssignments(nextAssignments);
      persistLineup(nextAssignments, nextPlan);
    },
    [players, persistLineup],
  );

  useEffect(() => {
    if (!squad || filledCount < 11) {
      onNavActionChange(null);
      return;
    }
    onNavActionChange({
      label: "Auswahl bestätigen",
      onClick: () => onConfirm(squad),
      title: "Startelf übernehmen und Spiel starten",
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

  return (
    <main className="matchday career-lineup">
      <MatchdayLineupAmbience setup={setup} />
      <section className="career-lineup-panel" aria-label="Aufstellung">
        <header className="career-lineup-header">
          <div className="career-lineup-header-main">
            <h1>Aufstellung</h1>
            <p className="career-lineup-sub">
              {filledCount}/11 · KW {week} {weekdayLabel(weekday)}
            </p>
          </div>
          <label className="career-lineup-formation career-lineup-formation--inline">
            Formation
            <select
              value={plan.formation}
              onChange={(event) => changeFormation(event.target.value as FormationId)}
            >
              {FORMATION_IDS.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>
        </header>

        <div className="career-lineup-controls" aria-label="Schnellwahl">
          <div className="career-lineup-auto-row">
            {AUTO_LINEUP_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                className="career-auto-btn"
                title={option.title}
                onClick={() => applyAuto(option.mode)}
              >
                <span aria-hidden="true">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
          <div className="career-lineup-presets" aria-label="Taktik-Presets">
            {tacticsPresets.map((preset) => (
              <div key={preset.id} className="career-preset-group">
                <button
                  type="button"
                  className={activePreset === preset.id ? "career-preset-btn is-active" : "career-preset-btn"}
                  title={`${preset.label} laden`}
                  onClick={() => {
                    const loaded = loadTacticsPreset(tacticsPresets, preset.id);
                    setPlan(loaded);
                    setActivePreset(preset.id);
                    const next = fillMissingAssignments(players, loaded.formation, assignments);
                    setAssignments(next);
                    persistLineup(next, loaded);
                  }}
                >
                  <span className="career-preset-label">{preset.id}</span>
                  <span>{preset.label}</span>
                </button>
                <button
                  type="button"
                  className="career-preset-save-mini"
                  title={`Aktuelle Taktik in Slot ${preset.id} speichern`}
                  onClick={() => {
                    onSaveTacticsPreset(preset.id, plan);
                    setActivePreset(preset.id);
                  }}
                >
                  💾
                </button>
              </div>
            ))}
          </div>
        </div>

        <details className="career-lineup-tactics">
          <summary>Taktik · {plan.mentality} / {plan.pressing} / {plan.lineHeight}</summary>
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

        <div className="career-lineup-board">
          <LineupPitch
            formation={plan.formation}
            assignments={assignments}
            playersById={playersById}
            dragPlayerId={dragPlayerId}
            onAssign={setSlot}
            onDragPlayer={setDragPlayerId}
          />
          <aside className="lineup-bench" aria-label="Ersatzbank">
            <h2 className="lineup-bench-title">Bank · {bench.length}</h2>
            <p className="lineup-bench-hint">Ziehen · ●/▲/◆ Form/Fit · WA</p>
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

        {filledCount < 11 ? (
          <p className="career-lineup-warning" role="status">
            Noch {11 - filledCount} Position{11 - filledCount === 1 ? "" : "en"} offen — Auto-Aufstellung oder Spieler ziehen.
          </p>
        ) : null}
      </section>
    </main>
  );
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
