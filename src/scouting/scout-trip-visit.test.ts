import { describe, expect, it } from "vitest";
import type { Player } from "../types/player.ts";
import { applyMapClubVisitToEstimate } from "./estimate-model.ts";
import { initialEstimateForPlayer } from "./market-list.ts";
import { emptyDiscovery } from "./scout-discovery.ts";
import { advanceActiveScoutTrip, type ActiveScoutTrip } from "./scout-trip.ts";

function proAtClub(clubId: string, id: string): Player {
  return {
    id,
    club_id: clubId,
    squad_status: "pro",
  } as Player;
}

describe("scout trip map visits", () => {
  it("applies map visit knowledge when trip completes (first visit adds pool + ×2/3)", () => {
    const clubId = "cl_trip_test";
    const player = proAtClub(clubId, "pl_10001");
    const trip = {
      id: "trip_test",
      zone_id: "elbmarsch",
      path_node_ids: [clubId],
      career_club_ids_on_path: [clubId],
      target_club_id: clubId,
      progress_multiplier: 1,
      duration: {
        setupWorkingDays: 1,
        scoutingWorkingDays: 4,
        teardownWorkingDays: 1,
        totalWorkingDays: 6,
        speedPct: 1,
        cityStops: 1,
      },
      queued_at_week: 1,
      assigned_scout_id: "scout_1",
      working_days_done: 5,
    } satisfies ActiveScoutTrip;

    const { trip: after, discovery, targets } = advanceActiveScoutTrip(
      trip,
      emptyDiscovery(),
      [player],
      {},
    );

    expect(after).toBeNull();
    expect(discovery.visited_club_ids).toContain(clubId);
    expect(discovery.scout_pool).toContain("pl_10001");
    const prior = initialEstimateForPlayer(player, 0);
    const expectedRange = applyMapClubVisitToEstimate(prior).uncertaintyRange;
    expect(targets["pl_10001"]?.estimate.uncertaintyRange).toBe(expectedRange);
    expect(expectedRange).toBeLessThan(prior.uncertaintyRange);
  });
});
