import { calendarWeek } from "./game-calendar.ts";
import { isoWeekOfWeekOne, seasonEndWeek } from "./season-schedule.ts";
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
 * Season week 1 falls in the season label year; weeks past New Year fall in the following calendar year (PRD 35).
 */
export function civilDateFromSession(
  season: number,
  seasonWeek: number,
  weekday: number,
): CivilDate {
  const isoWeek = calendarWeek(seasonWeek);
  const anchorYear = seasonCalendarYear(season);
  const civilYear = civilYearForSessionWeek(seasonWeek, isoWeek, anchorYear);
  return civilDateFromIsoWeek(civilYear, isoWeek, weekday);
}

function civilYearForSessionWeek(
  seasonWeek: number,
  isoWeek: number,
  anchorYear: number,
): number {
  if (seasonWeek < 1) {
    return anchorYear;
  }
  return isoWeek >= isoWeekOfWeekOne() ? anchorYear : anchorYear + 1;
}

/**
 * Civil year shown on the month grid for a month of the season. A 52-week season
 * (PRD 35) touches its start month twice — a few days at one end, most of the month
 * at the other — so the grid shows the year in which the season has more days.
 */
export function calendarGridYear(season: number, monthIndex: number): number {
  const anchorYear = seasonCalendarYear(season);
  const start = civilDateFromSession(season, 1, 1);
  const end = civilDateFromSession(season, seasonEndWeek(), 7);
  const startTime = Date.UTC(start.year, start.monthIndex, start.day);
  const endTime = Date.UTC(end.year, end.monthIndex, end.day);
  const daysIn = (year: number) => {
    const first = Date.UTC(year, monthIndex, 1);
    const last = Date.UTC(year, monthIndex + 1, 0);
    return Math.max(0, Math.min(last, endTime) - Math.max(first, startTime));
  };
  return daysIn(anchorYear + 1) > daysIn(anchorYear) ? anchorYear + 1 : anchorYear;
}

/** Month index (0=Jan) for the calendar grid that should show “today”. */
export function sessionMonthIndex(season: number, seasonWeek: number, weekday: number): number {
  return civilDateFromSession(season, seasonWeek, weekday).monthIndex;
}
