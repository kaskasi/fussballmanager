import { seasonEndWeek } from "../sim/season-schedule.ts";

/** PRD 05.6 — pre-contract window opens six months before expiry. */
export const PRE_CONTRACT_MONTHS = 6;

/** Approximate months left on a contract from the current calendar week. */
export function contractMonthsRemaining(
  season: number,
  week: number,
  untilSeason: number,
): number {
  if (untilSeason < season) return 0;
  const seasonsAfter = untilSeason - season;
  const endWeek = seasonEndWeek();
  const weeksLeftThisSeason = seasonsAfter === 0 ? Math.max(0, endWeek - week + 1) : endWeek;
  const monthFraction = weeksLeftThisSeason / (endWeek / 12);
  return Math.round(seasonsAfter * 12 + monthFraction);
}

export function contractSeasonsRemaining(season: number, untilSeason: number): number {
  return Math.max(0, untilSeason - season);
}

export function isPreContractWindow(
  season: number,
  week: number,
  untilSeason: number,
): boolean {
  const months = contractMonthsRemaining(season, week, untilSeason);
  return months > 0 && months <= PRE_CONTRACT_MONTHS;
}
