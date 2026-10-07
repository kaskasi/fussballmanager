import { describe, expect, it } from "vitest";
import type { ActiveScoutTrip } from "./scout-trip.ts";
import {
  activeTripCivilDayKeys,
  civilDateKey,
  countActiveScoutTrips,
} from "./scout-calendar-day.ts";
import { civilDateFromSession } from "../sim/session-civil-date.ts";

function trip(partial: Partial<ActiveScoutTrip> & Pick<ActiveScoutTrip, "id">): ActiveScoutTrip {
  return {
    zone_id: "nord",
    path_node_ids: [],
    career_club_ids_on_path: [],
    target_club_id: "club_1",
    progress_multiplier: 1,
    duration: {
      speedPct: 1,
      cityStops: 5,
      clubStops: 5,
      setupWorkingDays: 0,
      scoutingWorkingDays: 5,
      teardownWorkingDays: 0,
      totalWorkingDays: 5,
    },
    queued_at_week: 10,
    assigned_scout_id: "scout_1",
    working_days_done: 1,
    ...partial,
  };
}

describe("scout calendar day", () => {
  it("marks weekdays while trips are in progress", () => {
    const keys = activeTripCivilDayKeys(1, 10, [trip({ id: "t1" })]);
    expect(keys.size).toBe(5);
    const monday = civilDateKey(civilDateFromSession(1, 10, 1));
    expect(keys.has(monday)).toBe(true);
  });

  it("counts only incomplete trips", () => {
    expect(
      countActiveScoutTrips([
        trip({ id: "a", working_days_done: 5 }),
        trip({ id: "b", working_days_done: 2 }),
      ]),
    ).toBe(1);
  });
});
