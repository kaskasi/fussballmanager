import { civilDateFromSession } from "../sim/session-civil-date.ts";
import type { ActiveScoutTrip } from "./scout-trip.ts";

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

export function civilDateKey(civil: { year: number; monthIndex: number; day: number }): string {
  return `${civil.year}-${civil.monthIndex}-${civil.day}`;
}

/** Weekday cells (Mo–Fr) of the current session week while map scouts are still travelling. */
export function activeTripCivilDayKeys(
  season: number,
  sessionWeek: number,
  trips: readonly ActiveScoutTrip[],
): Set<string> {
  const keys = new Set<string>();
  const inProgress = trips.some(
    (trip) => trip.working_days_done < trip.duration.totalWorkingDays,
  );
  if (!inProgress) return keys;
  for (let weekday = 1; weekday <= 5; weekday += 1) {
    keys.add(civilDateKey(civilDateFromSession(season, sessionWeek, weekday)));
  }
  return keys;
}

export function countActiveScoutTrips(trips: readonly ActiveScoutTrip[]): number {
  return trips.filter((trip) => trip.working_days_done < trip.duration.totalWorkingDays).length;
}
