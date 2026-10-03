import { SEASON_END_WEEK } from "./game-calendar.ts";

export const DAYS_PER_WEEK = 7;
export const DAYS_PER_SEASON = SEASON_END_WEEK * DAYS_PER_WEEK;

export interface CalendarPoint {
  season: number;
  week: number;
  weekday: number;
}

export function calendarDayIndex(season: number, week: number, weekday: number): number {
  const s = Math.max(1, Math.round(season));
  const w = Math.min(SEASON_END_WEEK, Math.max(1, Math.round(week)));
  const d = Math.min(DAYS_PER_WEEK, Math.max(1, Math.round(weekday)));
  return (s - 1) * DAYS_PER_SEASON + (w - 1) * DAYS_PER_WEEK + (d - 1);
}

export function calendarPointFromIndex(index: number): CalendarPoint & { dayIndex: number } {
  const clamped = Math.max(0, Math.round(index));
  const season = Math.floor(clamped / DAYS_PER_SEASON) + 1;
  const rem = clamped % DAYS_PER_SEASON;
  return {
    season,
    week: Math.floor(rem / DAYS_PER_WEEK) + 1,
    weekday: (rem % DAYS_PER_WEEK) + 1,
    dayIndex: clamped,
  };
}

export function addCalendarDays(point: CalendarPoint, days: number): CalendarPoint & { dayIndex: number } {
  return calendarPointFromIndex(calendarDayIndex(point.season, point.week, point.weekday) + days);
}

export function daysUntil(now: CalendarPoint, untilDayIndex: number): number {
  return Math.max(0, untilDayIndex - calendarDayIndex(now.season, now.week, now.weekday));
}
