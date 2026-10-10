import type { Attributes, PositionFlexibility, PositionPrimary } from "../types/player.ts";
import {
  laneOrderIndex,
  positionLane,
  type StaerkeLane,
} from "./position-lanes.ts";

/** Weeks at which duration factor reaches 1 — longer weeks do not raise chance (PRD 07.7). */
export const RETRAIN_DURATION_CAP_WEEKS = 8;
export const RETRAIN_PARTIAL_K = 0.025;
export const RETRAIN_MAX_FAILURES = 2;

const LANE_SAME = 1;
const LANE_ADJACENT = 0.75;
const LANE_CROSS = 0.5;
const LANE_GK_FIELD = 0.35;

const PROB_FLOOR = 0.05;
const PROB_CEIL = 0.95;
const DISPLAY_PROB_FLOOR = 5;
const DISPLAY_PROB_CEIL = 95;

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function retrainDeterministicUnit(
  masterSeed: number,
  playerId: string,
  target: PositionPrimary,
  season: number,
  startedWeek: number,
): number {
  return mulberry32(
    hashSeed([masterSeed, playerId, target, season, startedWeek, "retrain"]),
  )();
}

export function retrainMentalFactor(attrs: Attributes): number {
  const sum = attrs.composure + attrs.concentration + attrs.teamwork;
  return Math.min(1, Math.max(0, sum / (3 * 199)));
}

export function retrainLaneFactor(from: PositionPrimary, to: PositionPrimary): number {
  const fromLane = positionLane(from);
  const toLane = positionLane(to);
  if (fromLane === "TW" || toLane === "TW") {
    if (fromLane === toLane) return LANE_SAME;
    return LANE_GK_FIELD;
  }
  const distance = Math.abs(laneOrderIndex(fromLane) - laneOrderIndex(toLane));
  if (distance === 0) return LANE_SAME;
  if (distance === 1) return LANE_ADJACENT;
  return LANE_CROSS;
}

export function retrainDurationFactor(plannedWeeks: number): number {
  const weeks = Math.max(1, plannedWeeks);
  return Math.min(1, weeks / RETRAIN_DURATION_CAP_WEEKS);
}

export interface RetrainProbabilityInput {
  plannedWeeks: number;
  from: PositionPrimary;
  to: PositionPrimary;
  attrs: Attributes;
  /** Existing proficiency on the exact target position slot (0–1). */
  currentProficiency: number;
  flexibility?: readonly PositionFlexibility[];
}

/** Lane mastery for the target role (same logic as profile “Stärke als…”). */
export function retrainLaneSkillForTarget(
  primary: PositionPrimary,
  flexibility: readonly PositionFlexibility[],
  target: PositionPrimary,
): number {
  const targetLane = positionLane(target);
  let skill = positionLane(primary) === targetLane ? 1 : 0;
  for (const slot of flexibility) {
    if (positionLane(slot.trained_as) === targetLane) {
      skill = Math.max(skill, slot.proficiency);
    }
  }
  return Math.min(1, Math.max(0, skill));
}

/** Documented constants — PRD 07.7. */
export function retrainSuccessProbability(input: RetrainProbabilityInput): number {
  const mental = retrainMentalFactor(input.attrs);
  const lane = retrainLaneFactor(input.from, input.to);
  const duration = retrainDurationFactor(input.plannedWeeks);
  const laneSkill = retrainLaneSkillForTarget(
    input.from,
    input.flexibility ?? [],
    input.to,
  );
  const targetHeadStart = Math.min(1, Math.max(0, input.currentProficiency));
  const base = 0.12 + 0.71 * laneSkill + 0.08 * targetHeadStart;
  const raw = base * duration * (0.7 + 0.3 * mental) * lane;
  return Math.min(PROB_CEIL, Math.max(PROB_FLOOR, raw));
}

export function rollRetrainSuccess(unit: number, probability: number): boolean {
  return unit < probability;
}

export function previewSuccessPercent(input: RetrainProbabilityInput): number {
  const p = retrainSuccessProbability(input);
  const display = Math.round(p * 100);
  return Math.min(DISPLAY_PROB_CEIL, Math.max(DISPLAY_PROB_FLOOR, display));
}

export function retrainPartialProficiencyGain(
  plannedWeeks: number,
  attrs: Attributes,
  currentProficiency: number,
): number {
  const mental = retrainMentalFactor(attrs);
  const delta = plannedWeeks * RETRAIN_PARTIAL_K * mental;
  return Math.min(0.95, Math.max(currentProficiency, currentProficiency + delta));
}

export function retrainLaneTone(
  from: PositionPrimary,
  to: PositionPrimary,
): "good" | "mid" | "low" {
  const factor = retrainLaneFactor(from, to);
  if (factor >= LANE_SAME - 0.01) return "good";
  if (factor >= LANE_ADJACENT - 0.01) return "mid";
  return "low";
}

export { STAERKE_LANE_LABELS } from "./position-lanes.ts";
