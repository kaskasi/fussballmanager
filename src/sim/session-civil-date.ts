import { calendarWeek, SEASON_START_CALENDAR_WEEK } from "./game-calendar.ts";
import { seasonCalendarYear } from "./season-label.ts";

export interface CivilDate {
  year: number;
  monthIndex: number;
  day: number;
}

function civilDateFromIsoWeek(year: number, isoWeek: number, weekday: number): CivilDate {
  const jan4 = new Date(year, 0, 4);
  const jan4Iso = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const mondayWeek1 = new Date(year, 0, 4 - (jan4Iso - 1));
  const target = new Date(mondayWeek1);
  target.setDate(mondayWeek1.getDate() + (isoWeek - 1) * 7 + (Math.max(1, weekday) - 1));
  return {
    year: target.getFullYear(),
    monthIndex: target.getMonth(),
    day: target.getDate(),
  };
}

/**
 * Map career week + weekday (Mo=1) to a civil date for calendar UI.
 * Spieltag 1 = KW 35 (late summer) in the season label year; Rückrunde = KW 1–16 in the following calendar year.
 */
export function civilDateFromSession(
  season: number,
  seasonWeek: number,
  weekday: number,
): CivilDate {
  const isoWeek = calendarWeek(seasonWeek);
  const anchorYear = seasonCalendarYear(season);
  const civilYear =
    isoWeek >= SEASON_START_CALENDAR_WEEK ? anchorYear : anchorYear + 1;
  return civilDateFromIsoWeek(civilYear, isoWeek, weekday);
}

/** Civil year shown on the month grid (Aug–Dec = label year, Jan–Jul = label year + 1). */
export function calendarGridYear(season: number, monthIndex: number): number {
  const anchorYear = seasonCalendarYear(season);
  return monthIndex >= 7 ? anchorYear : anchorYear + 1;
}

/** Month index (0=Jan) for the calendar grid that should show “today”. */
export function sessionMonthIndex(season: number, seasonWeek: number, weekday: number): number {
  return civilDateFromSession(season, seasonWeek, weekday).monthIndex;
}
