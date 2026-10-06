import { calendarWeek } from "./game-calendar.ts";
import { seasonCalendarYear } from "./season-label.ts";

export interface CivilDate {
  year: number;
  monthIndex: number;
  day: number;
}

/** Map career week + weekday (Mo=1) to a civil date for calendar UI. */
export function civilDateFromSession(
  season: number,
  seasonWeek: number,
  weekday: number,
): CivilDate {
  const isoWeek = calendarWeek(seasonWeek);
  const anchorYear = seasonCalendarYear(season);
  const jan4 = new Date(anchorYear, 0, 4);
  const jan4Iso = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const mondayWeek1 = new Date(anchorYear, 0, 4 - (jan4Iso - 1));
  const target = new Date(mondayWeek1);
  target.setDate(mondayWeek1.getDate() + (isoWeek - 1) * 7 + (Math.max(1, weekday) - 1));
  return {
    year: target.getFullYear(),
    monthIndex: target.getMonth(),
    day: target.getDate(),
  };
}

/** Month index (0=Jan) for the calendar grid that should show “today”. */
export function sessionMonthIndex(season: number, seasonWeek: number, weekday: number): number {
  return civilDateFromSession(season, seasonWeek, weekday).monthIndex;
}
