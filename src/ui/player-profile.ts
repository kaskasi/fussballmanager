import {
  programKindLabel,
  programLabel,
  type IndividualProgram,
} from "../development/individual-training.ts";
import { stampIcon } from "../development/ability-stamps.ts";
import { trainingUnit, type TrainingSlot } from "../development/training-units.ts";
import type { Attributes, GrowthSnapshot, Player, PositionPrimary } from "../types/player.ts";
import { roundStat } from "../types/player-display.ts";
import { caGroup, estimateCa } from "../transfers/market-value.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutReveal } from "../scouting/scout-visibility.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";

/** PRD 06.5: only `full` events get 💡. Generational flags stay off the timeline. */
const VISIBLE_BREAKOUTS = new Set([
  "mentor_ignition",
  "prodigy_pressure",
  "late_bloomer_kick",
  "underdog_resolve",
  "environment_shift_positive",
]);

const CA_WEIGHTS: Record<
  ReturnType<typeof caGroup>,
  Partial<Record<keyof Attributes, number>>
> = {
  GK: { gk_handling: 0.35, concentration: 0.15, positioning: 0.15, composure: 0.1, leadership: 0.1, passing: 0.15 },
  CB: { positioning: 0.25, strength: 0.2, concentration: 0.15, passing: 0.1, pace: 0.1, composure: 0.1, leadership: 0.1 },
  FB: { pace: 0.25, stamina: 0.15, passing: 0.2, positioning: 0.15, strength: 0.1, vision: 0.15 },
  MF: { passing: 0.25, vision: 0.2, stamina: 0.15, technique: 0.15, teamwork: 0.1, composure: 0.15 },
  AM: { vision: 0.25, technique: 0.2, passing: 0.2, dribbling: 0.15, composure: 0.1, shooting: 0.1 },
  W: { pace: 0.25, dribbling: 0.25, technique: 0.15, shooting: 0.15, passing: 0.1, vision: 0.1 },
  CF: { shooting: 0.35, composure: 0.15, pace: 0.15, strength: 0.1, positioning: 0.15, technique: 0.1 },
};

export type StateMark = "●" | "▲" | "◆";
export type StateTone = "good" | "mid" | "low";

export interface AttributeBar {
  key: keyof Attributes;
  value: number;
  /** Scout CI low edge. Own players omit this. */
  low?: number;
  high?: number;
  showValue: boolean;
  showCi: boolean;
  dimmed?: boolean;
}

export interface ProfileFact {
  icon: string;
  label: string;
  value: string;
}

export interface GrowthPoint {
  season: number;
  ca: number;
}

export function profileAttributeKeys(position: PositionPrimary): (keyof Attributes)[] {
  const weights = CA_WEIGHTS[caGroup(position)];
  return Object.entries(weights)
    .sort(([leftKey, left], [rightKey, right]) => (right ?? 0) - (left ?? 0) || leftKey.localeCompare(rightKey))
    .slice(0, 6)
    .map(([key]) => key as keyof Attributes);
}

export function attributeBars(player: Player, owned: boolean, estimate?: AbilityEstimate): AttributeBar[] {
  const keys = profileAttributeKeys(player.position);
  if (owned || !estimate) {
    return keys.map((key) => ({
      key,
      value: roundStat(player.attributes[key]),
      showValue: true,
      showCi: false,
    }));
  }
  const reveal = scoutReveal(estimate.uncertaintyRange);
  const half = estimate.uncertaintyRange / 2;
  return keys.slice(0, reveal.visibleBarCount).map((key) => {
    const trueValue = player.attributes[key];
    const estimateFill = Math.round(estimate.estimatedAbilityMean * reveal.barFillRatio);
    return {
      key,
      value: reveal.showExactSkills ? roundStat(trueValue) : estimateFill,
      low: reveal.showCi ? Math.max(0, estimate.estimatedAbilityMean - half) : undefined,
      high: reveal.showCi ? Math.min(199, estimate.estimatedAbilityMean + half) : undefined,
      showValue: reveal.showExactSkills,
      showCi: reveal.showCi,
      dimmed: !reveal.showExactSkills,
    };
  });
}

const ATTRIBUTE_LABELS: Partial<Record<keyof Attributes, string>> = {
  shooting: "Abschluss",
  passing: "Passspiel",
  dribbling: "Dribbling",
  technique: "Technik",
  pace: "Tempo",
  strength: "Kraft",
  stamina: "Ausdauer",
  composure: "Ruhe",
  leadership: "Führung",
  positioning: "Stellung",
  vision: "Übersicht",
  concentration: "Konzentration",
  teamwork: "Teamwork",
  gk_handling: "TW-Handling",
};

export function attributeLabel(key: keyof Attributes): string {
  return ATTRIBUTE_LABELS[key] ?? key;
}

export function profileFacts(player: Player, owned: boolean): ProfileFact[] {
  return [
    { icon: "🌍", label: "Nationalität", value: nationalityLabel(player.nationality) },
    { icon: "📍", label: "Region", value: player.birth.region },
    { icon: "🏟️", label: "Geburtsort", value: player.birth.place },
    { icon: "✍️", label: "Vertrag", value: contractLabel(player, owned) },
  ];
}

function nationalityLabel(code: string): string {
  if (code === "DE") return "Deutschland";
  return code;
}

function contractLabel(player: Player, owned: boolean): string {
  if (player.contract) {
    return `bis ${formatSeasonLabel(player.contract.until_season)}`;
  }
  if (player.squad_status === "u17" || player.squad_status === "u19") {
    return "Kein Vertrag";
  }
  if (!owned) return "Unbekannt";
  return "Verhandlung offen";
}

export function growthSeries(player: Player, currentSeason = 1): GrowthPoint[] {
  const currentCa = roundStat(estimateCa(player.attributes, player.position));
  const points = player.history.growth.map((snapshot) => ({
    season: snapshot.season,
    ca: roundStat(estimateCa(snapshot.attributes_snapshot, player.position)),
  }));
  if (points.length === 0) {
    return [{ season: currentSeason, ca: currentCa }];
  }
  const last = points.at(-1);
  if (last?.season === currentSeason && last.ca === currentCa) {
    return points;
  }
  return [...points, { season: currentSeason, ca: currentCa }];
}

export interface GrowthChartPoint extends GrowthPoint {
  x: number;
  y: number;
}

export function layoutGrowthChart(
  points: GrowthPoint[],
  width = 240,
  height = 72,
): GrowthChartPoint[] {
  if (points.length === 0) return [];
  const minCa = Math.min(...points.map((point) => point.ca));
  const maxCa = Math.max(...points.map((point) => point.ca));
  const span = maxCa - minCa;
  const padding = 4;
  const plotHeight = height - padding * 2;

  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const norm = span === 0 ? 0.5 : (point.ca - minCa) / span;
    const y = height - padding - norm * plotHeight;
    return { ...point, x, y };
  });
}

export function visibleBreakoutFlags(flags: readonly string[]): string[] {
  return flags.filter((flag) => VISIBLE_BREAKOUTS.has(flag));
}

export function stateMark(value: number, goodFrom = 70, midFrom = 40): { mark: StateMark; tone: StateTone } {
  if (value >= goodFrom) return { mark: "●", tone: "good" };
  if (value >= midFrom) return { mark: "▲", tone: "mid" };
  return { mark: "◆", tone: "low" };
}

export function formMark(form: number): { mark: StateMark; tone: StateTone } {
  if (form >= 2) return { mark: "●", tone: "good" };
  if (form >= -1) return { mark: "▲", tone: "mid" };
  return { mark: "◆", tone: "low" };
}

export function growthPolyline(points: GrowthPoint[], width = 240, height = 72): string {
  return layoutGrowthChart(points, width, height)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

export type StaerkeLane = "TW" | "IV" | "MF" | "ST";

export interface StaerkeAlsBar {
  lane: StaerkeLane;
  label: string;
  /** 0–1, primary position is 1. Flexibility fills other lanes. */
  value: number;
}

const STAERKE_LABELS: Record<StaerkeLane, string> = {
  TW: "Torhüter",
  IV: "Verteidiger",
  MF: "Mittelfeld",
  ST: "Stürmer",
};

/** PRD 14.3 — four coarse lanes, not a second attribute encyclopedia. */
export function positionLane(position: PositionPrimary): StaerkeLane {
  if (position === "GK") return "TW";
  if (position === "CB" || position === "LB" || position === "RB") return "IV";
  if (position === "LW" || position === "RW" || position === "CF") return "ST";
  return "MF";
}

export function staerkeAlsLanes(player: Player): StaerkeAlsBar[] {
  const scores: Record<StaerkeLane, number> = { TW: 0, IV: 0, MF: 0, ST: 0 };
  scores[positionLane(player.position)] = 1;
  for (const slot of player.flexibility) {
    const lane = positionLane(slot.trained_as);
    scores[lane] = Math.max(scores[lane], slot.proficiency);
  }
  return (["TW", "IV", "MF", "ST"] as const).map((lane) => ({
    lane,
    label: STAERKE_LABELS[lane],
    value: Math.min(1, Math.max(0, scores[lane])),
  }));
}

export interface DossierTrainingTarget {
  icon: string;
  title: string;
  detail: string;
  /** 0–1 when an individual program is running; null for team-wide focus. */
  progress: number | null;
}

/** PRD 14.3 — current Ziel: individual program, else team focus units. */
export function dossierTrainingTarget(
  player: Player,
  programs: readonly IndividualProgram[],
  plan: readonly TrainingSlot[],
  week: number,
): DossierTrainingTarget {
  const program = programs.find((entry) => entry.playerId === player.id);
  if (program) {
    const elapsed = Math.max(0, week - program.startedWeek);
    const total = Math.max(1, elapsed + program.weeksRemaining);
    return {
      icon:
        program.kind === "weak_foot"
          ? "🦶"
          : program.kind === "stamp"
            ? stampIcon(program.stampId ?? "")
            : "🧭",
      title: programKindLabel(program.kind),
      detail: programLabel(program),
      progress: Math.min(1, elapsed / total),
    };
  }
  const focusSlots = plan.filter((slot) => slot.focus);
  const first = focusSlots[0] ?? plan[0];
  if (!first) {
    return {
      icon: "🏋️",
      title: "Kein Plan",
      detail: "Mannschaftstraining noch offen",
      progress: null,
    };
  }
  const unit = trainingUnit(first.unitId);
  const extra = focusSlots.length > 1 ? ` · ${focusSlots.length} Fokus-Slots` : "";
  return {
    icon: "🏃",
    title: unit.label,
    detail: `Mannschaftsfokus${extra}`,
    progress: null,
  };
}

export const FAEHIGKEIT_HUNGER_SLOTS = 3;

export function appendSeasonSnapshot(player: Player, season: number): Player {
  const apps =
    player.state.season_apps > 0
      ? player.state.season_apps
      : player.state.season_minutes > 0
        ? Math.max(1, Math.round(player.state.season_minutes / 72))
        : 0;
  const snapshot: GrowthSnapshot = {
    season,
    age: player.age,
    attributes_snapshot: { ...player.attributes },
    minutes_played: player.state.season_minutes,
    drive_at_snapshot: player.hidden.drive,
    season_apps: apps,
    season_goals: player.state.season_goals ?? 0,
    season_assists: player.state.season_assists ?? 0,
  };
  return {
    ...player,
    history: {
      ...player.history,
      growth: [...player.history.growth, snapshot],
    },
  };
}
