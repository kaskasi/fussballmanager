import { needsSpendConfirm } from "./spend-runway.ts";
import { matchdayClock } from "../sim/season-schedule.ts";

/** Through this matchday (PRD 35: matchday clock of the week), capital projects cost more and always ask for confirm. */
export const EARLY_PACING_LAST_WEEK = 6;
export const EARLY_CAPITAL_SURCHARGE = 0.2;
export const INFRASTRUCTURE_CONFIRM_FLOOR = 25_000;

/** PRD 11.7 — scale precinct/stadium spend down after the opening weeks. */
export function infrastructureCostForWeek(baseCost: number, seasonWeek: number): number {
  if (baseCost <= 0) return 0;
  const clock = matchdayClock(seasonWeek);
  if (clock > EARLY_PACING_LAST_WEEK) return baseCost;
  const weeksLeft =
    (EARLY_PACING_LAST_WEEK - Math.min(EARLY_PACING_LAST_WEEK, Math.max(1, clock)) + 1) /
    EARLY_PACING_LAST_WEEK;
  return Math.round(baseCost * (1 + EARLY_CAPITAL_SURCHARGE * weeksLeft));
}

export function isEarlyCapitalSeason(seasonWeek: number): boolean {
  const clock = matchdayClock(seasonWeek);
  return clock >= 1 && clock <= EARLY_PACING_LAST_WEEK;
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
