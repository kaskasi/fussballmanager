import { describe, expect, it } from "vitest";
import type { Player } from "../types/player.ts";
import { applyMapClubVisitToEstimate } from "./estimate-model.ts";
import { initialEstimateForPlayer } from "./market-list.ts";
import { emptyDiscovery } from "./scout-discovery.ts";
import { scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";
import { advanceActiveScoutTrip, type ActiveScoutTrip } from "./scout-trip.ts";

function proAtClub(clubId: string, id: string): Player {
  return {
    id,
    club_id: clubId,
    squad_status: "pro",
  } as Player;
}

describe("scout trip map visits", () => {
  it("visits one club per working day and completes on last day", () => {
    const clubId = "cl_trip_test";
    const player = proAtClub(clubId, "pl_10001");
    const duration = scoutTripDurationFromClubStops(1, "sh");
    const trip = {
      id: "trip_test",
      zone_id: "sh",
      path_node_ids: [clubId],
      career_club_ids_on_path: [clubId],
      target_club_id: clubId,
      progress_multiplier: 1,
      duration,
      queued_at_week: 1,
      assigned_scout_id: "scout_1",
      working_days_done: 0,
    } satisfies ActiveScoutTrip;

    const mid = advanceActiveScoutTrip(trip, emptyDiscovery(), [player], {}, 1);
    expect(mid.trip).toBeNull();
    expect(mid.discovery.visited_club_ids).toContain(clubId);
    expect(mid.discovery.scout_pool).toContain("pl_10001");
    const prior = initialEstimateForPlayer(player, 0);
    const expectedRange = applyMapClubVisitToEstimate(prior).uncertaintyRange;
    expect(mid.targets["pl_10001"]?.estimate.uncertaintyRange).toBe(expectedRange);
  });
});
