import type { Attributes, PositionPrimary } from "../types/player.ts";

/**
 * Deterministic market value (PRD 05.1).
 * File is kebab-case per the project naming rule.
 *
 * Demand and reputation are caller inputs clamped to the published bounds.
 * The weekly scarcity count and the fame score are not formulas yet.
 * `wage` and `marketWage` must be the same pay period. The wage anchor in
 * PRD 05.4 depends on this value, so it is not used inside the formula.
 */

export type CaGroup = "GK" | "CB" | "FB" | "MF" | "AM" | "W" | "CF";

export const DEMAND_MIN = 0.85;
export const DEMAND_MAX = 1.2;
export const REPUTATION_MIN = 0.95;
export const REPUTATION_MAX = 1.15;

const CA_WEIGHTS: Record<CaGroup, Partial<Record<keyof Attributes, number>>> = {
  GK: { gk_handling: 0.35, concentration: 0.15, positioning: 0.15, composure: 0.1, leadership: 0.1, passing: 0.15 },
  CB: { positioning: 0.25, strength: 0.2, concentration: 0.15, passing: 0.1, pace: 0.1, composure: 0.1, leadership: 0.1 },
  FB: { pace: 0.25, stamina: 0.15, passing: 0.2, positioning: 0.15, strength: 0.1, vision: 0.15 },
  MF: { passing: 0.25, vision: 0.2, stamina: 0.15, technique: 0.15, teamwork: 0.1, composure: 0.15 },
  AM: { vision: 0.25, technique: 0.2, passing: 0.2, dribbling: 0.15, composure: 0.1, shooting: 0.1 },
  W: { pace: 0.25, dribbling: 0.25, technique: 0.15, shooting: 0.15, passing: 0.1, vision: 0.1 },
  CF: { shooting: 0.35, composure: 0.15, pace: 0.15, strength: 0.1, positioning: 0.15, technique: 0.1 },
};

const AGE_CURVE: Record<number, number> = {
  15: 0.15,
  16: 0.25,
  17: 0.4,
  18: 0.55,
  19: 0.7,
  20: 0.82,
  21: 0.9,
  22: 0.95,
  23: 0.98,
  24: 1,
  25: 1,
  26: 0.98,
  27: 0.95,
  28: 0.9,
  29: 0.82,
  30: 0.7,
  31: 0.55,
  32: 0.42,
  33: 0.3,
  34: 0.2,
};

export function caGroup(position: PositionPrimary): CaGroup {
  if (position === "GK") return "GK";
  if (position === "CB") return "CB";
  if (position === "LB" || position === "RB") return "FB";
  if (position === "DM" || position === "CM") return "MF";
  if (position === "AM") return "AM";
  if (position === "CF") return "CF";
  return "W";
}

/** Weighted attribute sum for one position group. Weights add up to 1. */
export function estimateCa(attributes: Attributes, position: PositionPrimary): number {
  const weights = CA_WEIGHTS[caGroup(position)];
  let sum = 0;
  for (const key of Object.keys(weights) as (keyof Attributes)[]) {
    sum += attributes[key] * (weights[key] ?? 0);
  }
  return sum;
}

/** ca 60 = 200_000. ca 100 ≈ 3.49M. */
export function baseAttributeValue(ca: number): number {
  return 200_000 * Math.pow(ca / 60, 5.6);
}

/**
 * Table value for the completed year. Under 20, the buyer's normalised
 * 12-month growth rate from PRD 04.5 adds `1 + 0.6 × rate`. Hidden Anlage
 * and Drive are not an input.
 */
export function ageCurveFactor(age: number, estimatedGrowthRateNormalized = 0): number {
  const year = Math.floor(age);
  const base = year >= 35 ? 0.12 : (AGE_CURVE[Math.max(15, year)] ?? 0.12);
  if (year >= 20) return base;
  return base * (1 + 0.6 * estimatedGrowthRateNormalized);
}

export function contractFactor(monthsRemaining: number, wage: number, marketWage: number): number {
  let factor = 1 + (monthsRemaining / 36) * 0.15;
  if (monthsRemaining <= 6) factor *= 0.5;
  if (wage > marketWage * 1.3) factor *= 0.85;
  return factor;
}

export interface MarketValueInput {
  /** Buyer's estimate, or the true CA when the owner prices their own player. */
  ca: number;
  age: number;
  monthsRemaining: number;
  wage: number;
  marketWage: number;
  demandFactor: number;
  reputationFactor: number;
  /** Used only under age 20. Omit when there is no sparkline. */
  estimatedGrowthRateNormalized?: number;
}

export function marketValue(input: MarketValueInput): number {
  return (
    baseAttributeValue(input.ca) *
    ageCurveFactor(input.age, input.estimatedGrowthRateNormalized ?? 0) *
    contractFactor(input.monthsRemaining, input.wage, input.marketWage) *
    clamp(input.demandFactor, DEMAND_MIN, DEMAND_MAX) *
    clamp(input.reputationFactor, REPUTATION_MIN, REPUTATION_MAX)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
