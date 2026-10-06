import { needsSpendConfirm } from "./spend-runway.ts";

/** Through this season week, capital projects cost more and always ask for confirm. */
export const EARLY_PACING_LAST_WEEK = 6;
export const EARLY_CAPITAL_SURCHARGE = 0.2;
export const INFRASTRUCTURE_CONFIRM_FLOOR = 25_000;

/** PRD 11.7 — scale precinct/stadium spend down after the opening weeks. */
export function infrastructureCostForWeek(baseCost: number, seasonWeek: number): number {
  if (baseCost <= 0) return 0;
  if (seasonWeek > EARLY_PACING_LAST_WEEK) return baseCost;
  const weeksLeft =
    (EARLY_PACING_LAST_WEEK - Math.min(EARLY_PACING_LAST_WEEK, Math.max(1, seasonWeek)) + 1) /
    EARLY_PACING_LAST_WEEK;
  return Math.round(baseCost * (1 + EARLY_CAPITAL_SURCHARGE * weeksLeft));
}

export function isEarlyCapitalSeason(seasonWeek: number): boolean {
  return seasonWeek >= 1 && seasonWeek <= EARLY_PACING_LAST_WEEK;
}

export function needsInfrastructureSpendConfirm(
  cost: number,
  seasonWeek: number,
  weeklyWageBill: number,
): boolean {
  if (!(cost > 0)) return false;
  if (isEarlyCapitalSeason(seasonWeek)) return true;
  if (cost >= INFRASTRUCTURE_CONFIRM_FLOOR) return true;
  return needsSpendConfirm(cost, weeklyWageBill);
}
