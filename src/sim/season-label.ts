/** Career season 1 is calendar year 2026. Completed seasons add to that year. */
export const CAREER_START_YEAR = 2026;

/** Career season index 1 = calendar 2026; negative indices = years before the save starts. */
export function seasonCalendarYear(season: number): number {
  return CAREER_START_YEAR + Math.round(season) - 1;
}

export function careerSeasonIndex(calendarYear: number): number {
  return calendarYear - CAREER_START_YEAR + 1;
}

export function formatSeasonLabel(season: number): string {
  return `Saison ${seasonCalendarYear(season)}`;
}
