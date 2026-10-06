/** Working-day scout trip length by zone speed (PRD 21 extension). */

export const SCOUT_TRIP_SPEED_FLOOR = 0.25;

export const ZONE_SCOUT_SPEED: Record<string, number> = {
  sh: 1,
  foerde: 1,
  hanse: 0.85,
  nordfries: 0.9,
  /** Placeholder for future Thailand slice. */
  pattaya: 0.25,
};

export function zoneScoutSpeedPct(zoneId: string): number {
  const raw = ZONE_SCOUT_SPEED[zoneId] ?? 1;
  return Math.max(SCOUT_TRIP_SPEED_FLOOR, Math.min(1, raw));
}

export interface ScoutTripDurationBreakdown {
  speedPct: number;
  cityStops: number;
  setupWorkingDays: number;
  scoutingWorkingDays: number;
  teardownWorkingDays: number;
  totalWorkingDays: number;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * 100% (SH): 1d setup + 1d teardown, 2 club/city stops per working day.
 * 25% (Pattaya): 5d setup + 5d teardown, 2 working days per stop.
 */
export function scoutTripDuration(
  zoneId: string,
  cityStops: number,
): ScoutTripDurationBreakdown {
  const speedPct = zoneScoutSpeedPct(zoneId);
  if (cityStops <= 0) {
    return {
      speedPct,
      cityStops: 0,
      setupWorkingDays: 0,
      scoutingWorkingDays: 0,
      teardownWorkingDays: 0,
      totalWorkingDays: 0,
    };
  }

  const t = (1 - speedPct) / (1 - SCOUT_TRIP_SPEED_FLOOR);
  const setupWorkingDays = Math.max(1, Math.round(lerp(1, 5, t)));
  const teardownWorkingDays = setupWorkingDays;
  const scoutingWorkingDays =
    speedPct >= 0.999
      ? Math.ceil(cityStops / 2)
      : Math.max(1, Math.round(cityStops * lerp(1, 2, t)));

  return {
    speedPct,
    cityStops,
    setupWorkingDays,
    scoutingWorkingDays,
    teardownWorkingDays,
    totalWorkingDays: setupWorkingDays + scoutingWorkingDays + teardownWorkingDays,
  };
}

/** Mon–Fri only; used when simulating day-by-day later. */
export function isScoutWorkingWeekday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

export const WORKING_DAYS_PER_GAME_WEEK = 5;
