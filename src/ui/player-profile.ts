import type { Attributes, GrowthSnapshot, Player, PositionPrimary } from "../types/player.ts";
import { roundStat } from "../types/player-display.ts";
import { caGroup, estimateCa } from "../transfers/market-value.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutReveal } from "../scouting/scout-visibility.ts";

/** PRD 06.5: only `full` events get 💡. Generational flags stay off the timeline. */
const VISIBLE_BREAKOUTS = new Set([
  "mentor_ignition",
  "injury_desperation",
  "prodigy_pressure",
  "success_inflation",
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
    return `bis Saison ${player.contract.until_season}`;
  }
  if (player.squad_status === "u17" || player.squad_status === "u19") {
    return "Jugendvertrag";
  }
  if (!owned) return "Unbekannt";
  return "Verhandlung offen";
}

export function growthSeries(player: Player): GrowthPoint[] {
  const points = player.history.growth.map((snapshot) => ({
    season: snapshot.season,
    ca: roundStat(estimateCa(snapshot.attributes_snapshot, player.position)),
  }));
  if (points.length === 0) {
    return [{ season: 1, ca: roundStat(estimateCa(player.attributes, player.position)) }];
  }
  return points;
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
  if (points.length === 0) return "";
  const minCa = Math.min(...points.map((point) => point.ca));
  const maxCa = Math.max(...points.map((point) => point.ca));
  const span = Math.max(maxCa - minCa, 1);
  const step = points.length === 1 ? 0 : width / (points.length - 1);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : index * step;
      const y = height - ((point.ca - minCa) / span) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
}

export function appendSeasonSnapshot(player: Player, season: number): Player {
  const snapshot: GrowthSnapshot = {
    season,
    age: player.age,
    attributes_snapshot: { ...player.attributes },
    minutes_played: player.state.season_minutes,
    drive_at_snapshot: player.hidden.drive,
  };
  return {
    ...player,
    history: {
      ...player.history,
      growth: [...player.history.growth, snapshot],
    },
  };
}
