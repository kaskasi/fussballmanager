/**
 * In-game calendar (PRD 05 transfer windows + PRD 03 intake timing).
 * Intern: Saisonwochen 1–34 = Spieltage 1–34.
 * Anzeige-KW: deutsches Ligajahr, Spieltag 1 = Ende August (KW 35).
 */

export const WEEKS_PER_YEAR = 52;
export const SEASON_END_WEEK = 34;
export const LEAGUE_FIRST_WEEK = 1;
export const LEAGUE_LAST_WEEK = 34;
/** Prep weeks before Spieltag 1 (new careers start here). Playtest 2026-10-09. */
export const PRESEASON_WEEKS = 2;
export const CAREER_START_WEEK = LEAGUE_FIRST_WEEK - PRESEASON_WEEKS;
/** ISO-style calendar week of Spieltag 1 (late August in Germany). */
export const SEASON_START_CALENDAR_WEEK = 35;
/** ISO weeks (PRD 05): preseason KW 33–34 (new careers) plus Spieltag 1–2 (KW 35–36); winter KW 2–4. */
export const SUMMER_WINDOW_CALENDAR_WEEKS = [33, 34, 35, 36] as const;
export const WINTER_WINDOW_CALENDAR_WEEKS = [2, 3, 4] as const;

function wrapIsoWeek(raw: number): number {
  let iso = raw;
  while (iso < 1) iso += WEEKS_PER_YEAR;
  while (iso > WEEKS_PER_YEAR) iso -= WEEKS_PER_YEAR;
  return iso;
}

export function calendarWeek(seasonWeek: number): number {
  const week = Math.round(seasonWeek);
  return wrapIsoWeek(SEASON_START_CALENDAR_WEEK + week - 1);
}

export function formatCalendarWeek(seasonWeek: number): string {
  return `KW ${calendarWeek(seasonWeek)}`;
}

export function isLeagueMatchWeek(week: number): boolean {
  return week >= LEAGUE_FIRST_WEEK && week <= LEAGUE_LAST_WEEK;
}

export function isSummerTransferWindow(week: number): boolean {
  const kw = calendarWeek(week);
  return (SUMMER_WINDOW_CALENDAR_WEEKS as readonly number[]).includes(kw);
}

export function isWinterTransferWindow(week: number): boolean {
  const kw = calendarWeek(week);
  return (WINTER_WINDOW_CALENDAR_WEEKS as readonly number[]).includes(kw);
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
/**
 * First week of the next transfer window strictly after `week` — when a deal agreed outside a window
 * is executed. After the winter window it is Spieltag 1 of the next season (the summer window).
 */
export function nextTransferWindowStart(season: number, week: number): { season: number; week: number } {
  for (let next = week + 1; next <= SEASON_END_WEEK; next += 1) {
    if (isSummerTransferWindow(next) || isWinterTransferWindow(next)) return { season, week: next };
  }
  return { season: season + 1, week: LEAGUE_FIRST_WEEK };
}

export function advanceCalendarWeek(week: number): { nextWeek: number; footballSeasonEnded: boolean } {
  if (week >= SEASON_END_WEEK) {
    return { nextWeek: 1, footballSeasonEnded: true };
  }
  return { nextWeek: week + 1, footballSeasonEnded: false };
}
