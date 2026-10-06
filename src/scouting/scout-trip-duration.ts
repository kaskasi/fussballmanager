/** Working-day scout trip length — 1 Mo–Fr day per club on the route (PRD 21). */

export const SCOUT_TRIP_SPEED_FLOOR = 0.25;

/** Legacy zone speed (display / future hooks); does not extend trip calendar in v1. */
export const ZONE_SCOUT_SPEED: Record<string, number> = {
  sh: 1,
  foerde: 1,
  hanse: 0.85,
  nordfries: 0.9,
  pattaya: 0.25,
};

export function zoneScoutSpeedPct(zoneId: string): number {
  const raw = ZONE_SCOUT_SPEED[zoneId] ?? 1;
  return Math.max(SCOUT_TRIP_SPEED_FLOOR, Math.min(1, raw));
}

export interface ScoutTripDurationBreakdown {
  speedPct: number;
  cityStops: number;
  clubStops: number;
  setupWorkingDays: number;
  scoutingWorkingDays: number;
  teardownWorkingDays: number;
  totalWorkingDays: number;
}

/** Calendar length = one working day per distinct club on the route. */
export function scoutTripDurationFromClubStops(
  clubStopCount: number,
  zoneId = "sh",
): ScoutTripDurationBreakdown {
  const speedPct = zoneScoutSpeedPct(zoneId);
  const clubStops = Math.max(0, clubStopCount);
  const totalWorkingDays = clubStops > 0 ? clubStops : 0;
  return {
    speedPct,
    cityStops: clubStops,
    clubStops,
    setupWorkingDays: 0,
    scoutingWorkingDays: totalWorkingDays,
    teardownWorkingDays: 0,
    totalWorkingDays,
  };
}

/** Path stop count ≈ club count for planning UI before nodes are resolved. */
export function scoutTripDuration(zoneId: string, cityStops: number): ScoutTripDurationBreakdown {
  return scoutTripDurationFromClubStops(cityStops, zoneId);
}

/** Mon–Fri only; used when simulating day-by-day later. */
export function isScoutWorkingWeekday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

export const WORKING_DAYS_PER_GAME_WEEK = 5;
