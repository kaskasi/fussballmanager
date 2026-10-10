import type { Attributes, Player, PositionPrimary } from "../types/player.ts";

/**
 * Deterministic market value (PRD 05.1).
 * Present value at age + development upside for youth (no hidden potential field).
 */

export type CaGroup = "GK" | "CB" | "FB" | "MF" | "AM" | "W" | "CF";

export const DEMAND_MIN = 0.85;
export const DEMAND_MAX = 1.2;
export const REPUTATION_MIN = 0.95;
export const REPUTATION_MAX = 1.15;

/** Cap for under-21 valuations without awards (PRD 05.1). */
export const YOUTH_MARKET_VALUE_CAP = 8_000_000;

const CA_WEIGHTS: Record<CaGroup, Partial<Record<keyof Attributes, number>>> = {
  GK: { gk_handling: 0.35, concentration: 0.15, positioning: 0.15, composure: 0.1, leadership: 0.1, passing: 0.15 },
  CB: { positioning: 0.25, strength: 0.2, concentration: 0.15, passing: 0.1, pace: 0.1, composure: 0.1, leadership: 0.1 },
  FB: { pace: 0.25, stamina: 0.15, passing: 0.2, positioning: 0.15, strength: 0.1, vision: 0.15 },
  MF: { passing: 0.25, vision: 0.2, stamina: 0.15, technique: 0.15, teamwork: 0.1, composure: 0.15 },
  AM: { vision: 0.25, technique: 0.2, passing: 0.2, dribbling: 0.15, composure: 0.1, shooting: 0.1 },
  W: { pace: 0.25, dribbling: 0.25, technique: 0.15, shooting: 0.15, passing: 0.1, vision: 0.1 },
  CF: { shooting: 0.35, composure: 0.15, pace: 0.15, strength: 0.1, positioning: 0.15, technique: 0.1 },
};

const PEAK_DECLINE: Record<number, number> = {
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

/** Career peak present value — light youth risk discount, not a 0.15 malus. */
export function presentValueFactor(age: number): number {
  const year = Math.floor(age);
  if (year <= 17) return 0.88 + (year - 15) * 0.035;
  if (year <= 22) return 0.95 + (year - 18) * 0.0125;
  if (year <= 27) return 1;
  if (year >= 35) return 0.12;
  return PEAK_DECLINE[year] ?? 0.12;
}

/** Normalised 0–1 growth signal from rolling attribute momentum (owner + buyer). */
export function normalizedGrowthSignal(player: Pick<Player, "age" | "state">): number {
  if (player.age >= 21) return 0;
  return Math.min(1, (player.state?.recent_growth_26w ?? 0) / 35);
}

/**
 * Upside premium for players still developing (age &lt; 21).
 * Uses public growth signal and CA headroom toward soft cap — not hidden anlage.
 */
export function developmentUpsideFactor(
  age: number,
  ca: number,
  growthSignalNormalized: number,
): number {
  if (age >= 21) return 1;
  const youthWeight = clamp((21 - age) / 6, 0, 1);
  const headroom = clamp((180 - ca) / 81, 0, 1);
  const signal = clamp(growthSignalNormalized, 0, 1);
  const blend = youthWeight * (0.35 + 0.65 * signal) * (0.4 + 0.6 * headroom);
  const upsideMax = 0.55;
  return 1 + upsideMax * blend;
}

/** @deprecated PRD 05.1 legacy name — present × development. */
export function ageCurveFactor(
  age: number,
  estimatedGrowthRateNormalized = 0,
  ca = 100,
): number {
  return presentValueFactor(age) * developmentUpsideFactor(age, ca, estimatedGrowthRateNormalized);
}

export function contractFactor(
  monthsRemaining: number,
  wage: number,
  marketWage: number,
  options?: { youthAcademy?: boolean },
): number {
  let factor = 1 + (monthsRemaining / 36) * 0.15;
  if (monthsRemaining <= 6) {
    factor *= 0.5;
    if (options?.youthAcademy) factor = Math.max(factor, 0.82);
  }
  if (wage > marketWage * 1.3) factor *= 0.85;
  return factor;
}

export interface MarketValueInput {
  ca: number;
  age: number;
  monthsRemaining: number;
  wage: number;
  marketWage: number;
  demandFactor: number;
  reputationFactor: number;
  estimatedGrowthRateNormalized?: number;
  squadStatus?: Player["squad_status"];
}

export interface MarketValueBreakdown {
  base: number;
  presentFactor: number;
  developmentFactor: number;
  contractFactor: number;
  demandFactor: number;
  reputationFactor: number;
  total: number;
  capped: boolean;
}

export function marketValueBreakdown(input: MarketValueInput): MarketValueBreakdown {
  const base = baseAttributeValue(input.ca);
  const growth = input.estimatedGrowthRateNormalized ?? 0;
  const presentFactor = presentValueFactor(input.age);
  const developmentFactor = developmentUpsideFactor(input.age, input.ca, growth);
  const contract = contractFactor(input.monthsRemaining, input.wage, input.marketWage, {
    youthAcademy: input.squadStatus === "u17" || input.squadStatus === "u19",
  });
  const demandFactor = clamp(input.demandFactor, DEMAND_MIN, DEMAND_MAX);
  const reputationFactor = clamp(input.reputationFactor, REPUTATION_MIN, REPUTATION_MAX);
  let total = base * presentFactor * developmentFactor * contract * demandFactor * reputationFactor;
  let capped = false;
  if (input.age < 21 && total > YOUTH_MARKET_VALUE_CAP) {
    total = YOUTH_MARKET_VALUE_CAP;
    capped = true;
  }
  return {
    base,
    presentFactor,
    developmentFactor,
    contractFactor: contract,
    demandFactor,
    reputationFactor,
    total,
    capped,
  };
}

export function marketValue(input: MarketValueInput): number {
  return marketValueBreakdown(input).total;
}

export function marketValueInputFromPlayer(
  player: Player,
  ca: number,
  season: number,
  overrides: Partial<MarketValueInput> = {},
): MarketValueInput {
  const wage = player.contract?.wage_weekly ?? 0;
  const seasonsLeft = player.contract ? Math.max(0, player.contract.until_season - season) : 0;
  return {
    ca,
    age: player.age,
    monthsRemaining: seasonsLeft * 12,
    wage,
    marketWage: Math.max(1, (baseAttributeValue(ca) * 0.008) / 52),
    demandFactor: 1,
    reputationFactor: 1,
    estimatedGrowthRateNormalized: normalizedGrowthSignal(player),
    squadStatus: player.squad_status,
    ...overrides,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
