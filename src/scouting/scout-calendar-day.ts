export interface ScoutCalendarDay {
  season: number;
  week: number;
  weekday: number;
}

export function isCalendarBefore(a: ScoutCalendarDay, b: ScoutCalendarDay): boolean {
  if (a.season !== b.season) return a.season < b.season;
  if (a.week !== b.week) return a.week < b.week;
  return a.weekday < b.weekday;
}
