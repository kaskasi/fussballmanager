import type { Attributes } from "../types/player.ts";

/**
 * Weekly attribute growth (PRD 02.1).
 * File is kebab-case per the project naming rule; the formula is the one in
 * `/docs/prd/02_growth_engine.md`. Curve numbers live in
 * `/data/rules/growth_curves.json` and are mirrored here so the client bundle
 * does not have to resolve a file outside `src`.
 */

const SOFT_CAP = 180;
const GROWTH_MIN = -3;
const GROWTH_MAX = 5;
export const LEARNING_BASE_POINTS_PER_WEEK = 0.07;

const TECHNICAL = new Set<keyof Attributes>([
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "weak_foot",
]);

const PHYSICAL = new Set<keyof Attributes>([
  "pace",
  "strength",
  "stamina",
  "gk_handling",
]);

export type FocusSlots = 0 | 1 | 2;

export interface WeeklyGrowthInput {
  age: number;
  maturityOffset: number;
  attribute: keyof Attributes;
  /** Stored value, used only for the soft cap at 180. */
  value: number;
  anlage: number;
  drive: number;
  minutes: number;
  injured: boolean;
  focusSlots: FocusSlots;
  /**
   * Multiplicative noise. Omit to draw N(1, σ). Tests pass 1.
   * Draws below 0 are treated as 0.
   */
  noise?: number;
  /** F8.1 coaching staff environment bonus. Default 1.0. */
  environmentFactor?: number;
  /** PRD 06 Tier-2 breakout/slump product multiplier. Default 1.0. */
  growthMultiplier?: number;
  squadStatus?: "pro" | "u17" | "u19" | "loaned_out";
  seasonApps?: number;
  /** League matchdays already completed this season (for pro playing-time gate). */
  leagueMatchdaysPlayed?: number;
  random?: () => number;
}

export function effectiveAge(age: number, maturityOffset: number): number {
  return Math.min(45, Math.max(14, age + maturityOffset));
}

/**
 * Age multiplier for learning speed (PRD 02.1 — steep 15–20, taper from 25).
 * Curve labels in PRD 02.2 are not a second multiplier.
 */
export function ageDevelopmentFactor(effectiveAgeValue: number): number {
  if (effectiveAgeValue < 15) return 1.1;
  if (effectiveAgeValue <= 20) return 2.4;
  if (effectiveAgeValue <= 25) return 1.45;
  if (effectiveAgeValue <= 27) return 1;
  if (effectiveAgeValue <= 32) return 0.65;
  return 0.28;
}

/** `LEARNING_BASE × ageDevelopmentFactor`. */
export function learningBase(effectiveAgeValue: number): number {
  return LEARNING_BASE_POINTS_PER_WEEK * ageDevelopmentFactor(effectiveAgeValue);
}

export function attributeSigma(attribute: keyof Attributes): number {
  if (TECHNICAL.has(attribute)) return 0.15;
  if (PHYSICAL.has(attribute)) return 0.2;
  return 0.1;
}

/** +33% training growth per focus session on that attribute group (max 2/week). */
export const TRAINING_FOCUS_BONUS_PER_SLOT = 0.33;

/** Injured weeks zero the training term. Healthy: 1.0 / 1.33 / 1.66. */
export function trainingFocus(slots: FocusSlots, injured: boolean): number {
  if (injured) return 0;
  if (slots === 2) return 1 + TRAINING_FOCUS_BONUS_PER_SLOT * 2;
  if (slots === 1) return 1 + TRAINING_FOCUS_BONUS_PER_SLOT;
  return 1;
}

/** Profis unter 50 % Einsatzquote lernen langsamer — U19 oft sinnvoller (PRD 02.5). */
export function proPlayingTimeLearningFactor(
  squadStatus: WeeklyGrowthInput["squadStatus"],
  seasonApps: number,
  leagueMatchdaysPlayed: number,
): number {
  if (squadStatus !== "pro") return 1;
  if (leagueMatchdaysPlayed < 4) return 1;
  const rate = seasonApps / leagueMatchdaysPlayed;
  if (rate >= 0.5) return 1;
  return 0.55 + (rate / 0.5) * 0.45;
}

export function calculateMatchPractice(
  minutes: number,
  injured: boolean,
  playingTimeFactor = 1,
): number {
  if (injured) return 0.3;
  if (minutes === 0) return 0.7 * playingTimeFactor;
  return (1 + (minutes / 90) * 0.15) * playingTimeFactor;
}

/** Coaching/building environment multiplier. Callers must not fold minutes or focus into it. */
export function environment(factor = 1): number {
  return factor;
}

/** Subtractive weekly decay. Leadership never decays. `gk_handling` uses `all_other`. */
export function decayPerWeek(attribute: keyof Attributes, effectiveAgeValue: number): number {
  if (attribute === "leadership") return 0;
  if (attribute === "pace") {
    return effectiveAgeValue >= 25 ? 1.5 / 52 : 0;
  }
  if (attribute === "stamina") {
    return effectiveAgeValue >= 27 ? 1.2 / 52 : 0;
  }
  if (attribute === "strength") {
    return effectiveAgeValue >= 30 ? 0.8 / 52 : 0;
  }
  return effectiveAgeValue >= 32 ? 0.3 / 52 : 0;
}

export function sampleNoise(attribute: keyof Attributes, random: () => number = Math.random): number {
  const sigma = attributeSigma(attribute);
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0, 1 + z * sigma);
}

/** Training term only (no weekly decay, soft cap, or final clamp). */
export function calculateWeeklyTrainingGain(input: WeeklyGrowthInput): number {
  const age = effectiveAge(input.age, input.maturityOffset);
  const noise =
    input.noise === undefined
      ? sampleNoise(input.attribute, input.random)
      : Math.max(0, input.noise);

  const playingTime = proPlayingTimeLearningFactor(
    input.squadStatus,
    input.seasonApps ?? 0,
    input.leagueMatchdaysPlayed ?? 0,
  );

  return (
    learningBase(age) *
    input.anlage *
    input.drive *
    environment(input.environmentFactor ?? 1) *
    (input.growthMultiplier ?? 1) *
    noise *
    trainingFocus(input.focusSlots, input.injured) *
    calculateMatchPractice(input.minutes, input.injured, playingTime)
  );
}

/** Subtractive weekly decay as a delta (≤ 0). */
export function weeklyDecayDelta(
  attribute: keyof Attributes,
  age: number,
  maturityOffset: number,
): number {
  const effectiveAgeValue = effectiveAge(age, maturityOffset);
  const decay = decayPerWeek(attribute, effectiveAgeValue);
  if (decay === 0) return 0;
  return Math.max(GROWTH_MIN, -decay);
}

/**
 * Weekly delta for one attribute, after soft cap and the [−3, +5] clamp.
 * The stored 0–199 cap is applied by the caller when writing the attribute.
 */
export function calculateWeeklyGrowth(input: WeeklyGrowthInput): number {
  const age = effectiveAge(input.age, input.maturityOffset);
  let growth = calculateWeeklyTrainingGain(input) - decayPerWeek(input.attribute, age);

  if (input.value >= SOFT_CAP && growth > 0) {
    growth *= 0.3;
  }

  return Math.min(GROWTH_MAX, Math.max(GROWTH_MIN, growth));
}

export function applyGrowth(value: number, delta: number): number {
  return Math.min(199, Math.max(0, value + delta));
}
