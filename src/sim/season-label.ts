/** Career season 1 is calendar year 2026. Completed seasons add to that year. */
export const CAREER_START_YEAR = 2026;

export function seasonCalendarYear(season: number): number {
  return CAREER_START_YEAR + Math.max(0, Math.round(season) - 1);
}

export function formatSeasonLabel(season: number): string {
  return `Saison ${seasonCalendarYear(season)}`;
}
