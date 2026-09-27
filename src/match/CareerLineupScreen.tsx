/** WIREFRAME: PRD 09.2 — pre-match lineup, formation pick + confirm suggested XI */
import { useEffect, useMemo, useState } from "react";
import {
  FORMATION_IDS,
  sandboxPlanFromFormation,
  type FormationId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { suggestCareerSquad } from "../sim/career-engine-squad.ts";
import {
  loadTacticsPreset,
  saveTacticsPreset,
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
  onSaveTacticsPreset: (id: TacticsPresetId, plan: SandboxPlan) => void;
  onConfirm: (squad: Squad) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
};

export function CareerLineupScreen({
  setup,
  players,
  week,
  weekday,
  tacticsPresets,
  onSaveTacticsPreset,
  onConfirm,
  onNavActionChange,
}: CareerLineupScreenProps) {
  const [plan, setPlan] = useState<SandboxPlan>(() => loadTacticsPreset(tacticsPresets, 1));
  const [activePreset, setActivePreset] = useState<TacticsPresetId | null>(1);
  const squad = useMemo(() => suggestCareerSquad(players, plan), [players, plan]);

  useEffect(() => {
    if (!squad) {
      onNavActionChange(null);
      return;
    }
    onNavActionChange({
      label: "Auswahl bestätigen",
      onClick: () => onConfirm(squad),
      title: "Startelf-Vorschlag übernehmen und Spiel starten",
    });
    return () => onNavActionChange(null);
  }, [squad, plan, onConfirm, onNavActionChange]);

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
          <p className="eyebrow">KW {week} · {weekdayLabel(weekday)}</p>
          <h1>Aufstellung</h1>
          <p className="career-lineup-sub">
            Preset laden, Feintuning, dann Vorschlag bestätigen.
          </p>
        </header>

        <div className="career-lineup-presets" aria-label="Taktik-Presets">
          {tacticsPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={
                activePreset === preset.id
                  ? "career-preset-btn is-active"
                  : "career-preset-btn"
              }
              title={`${preset.label} laden`}
              onClick={() => {
                setPlan(loadTacticsPreset(tacticsPresets, preset.id));
                setActivePreset(preset.id);
              }}
            >
              <span className="career-preset-label">{preset.id}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="career-lineup-toolbar">
          <label className="career-lineup-formation">
            Formation
            <select
              value={plan.formation}
              onChange={(event) => {
                setActivePreset(null);
                setPlan(sandboxPlanFromFormation(event.target.value as FormationId));
              }}
            >
              {FORMATION_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <TacticSlider
            label="Mentalität"
            value={plan.mentality}
            onChange={(mentality) => {
              setActivePreset(null);
              setPlan((current) => ({ ...current, mentality }));
            }}
          />
          <TacticSlider
            label="Pressing"
            value={plan.pressing}
            onChange={(pressing) => {
              setActivePreset(null);
              setPlan((current) => ({ ...current, pressing }));
            }}
          />
          <TacticSlider
            label="Linie"
            value={plan.lineHeight}
            min={25}
            max={90}
            onChange={(lineHeight) => {
              setActivePreset(null);
              setPlan((current) => ({ ...current, lineHeight }));
            }}
          />
        </div>

        <div className="career-lineup-save-row">
          {tacticsPresets.map((preset) => (
            <button
              key={`save-${preset.id}`}
              type="button"
              className="career-preset-save"
              onClick={() => {
                onSaveTacticsPreset(preset.id, plan);
                setActivePreset(preset.id);
              }}
            >
              💾 Slot {preset.id}
            </button>
          ))}
        </div>

        <div className="squad-table-wrap">
          <table className="squad-table career-lineup-table" aria-label="Startelf-Vorschlag">
            <thead>
              <tr>
                <th>Pos</th>
                <th className="squad-col-name">Name</th>
                <th>Rolle</th>
                <th>Nr</th>
              </tr>
            </thead>
            <tbody>
              {squad.starters.map((place) => (
                <tr key={place.slot} className="squad-table-row">
                  <td>{place.slot}</td>
                  <td className="squad-col-name">{place.player.name}</td>
                  <td>{place.player.role}</td>
                  <td>{place.player.shirt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
