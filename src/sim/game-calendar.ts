/**
 * In-game calendar (PRD 05 transfer windows + PRD 03 intake timing).
 * Sportliche Saison: Wochen 1–34, Liga-Spieltage 1–34.
 */

export const WEEKS_PER_YEAR = 52;
export const SEASON_END_WEEK = 34;
export const LEAGUE_FIRST_WEEK = 1;
export const LEAGUE_LAST_WEEK = 34;

export function isLeagueMatchWeek(week: number): boolean {
  return week >= LEAGUE_FIRST_WEEK && week <= LEAGUE_LAST_WEEK;
}

export function isSummerTransferWindow(week: number): boolean {
  return week >= 27 && week <= 34;
}

export function isWinterTransferWindow(week: number): boolean {
  return week >= 2 && week <= 4;
}

export function calendarPhaseLabel(week: number): string {
  if (isLeagueMatchWeek(week)) return `Liga · Spieltag ${week}`;
  if (week === SEASON_END_WEEK) return "Saisonende · Intake";
  if (week > LEAGUE_LAST_WEEK && week < SEASON_END_WEEK) return "Nachsaison";
  if (isSummerTransferWindow(week)) return "Sommerfenster";
  if (isWinterTransferWindow(week)) return "Winterfenster";
  return "Vorbereitung";
}

/** Advance one calendar week; football season ends after week 34. */
export function advanceCalendarWeek(week: number): { nextWeek: number; footballSeasonEnded: boolean } {
  if (week >= SEASON_END_WEEK) {
    return { nextWeek: 1, footballSeasonEnded: true };
  }
  return { nextWeek: week + 1, footballSeasonEnded: false };
}
