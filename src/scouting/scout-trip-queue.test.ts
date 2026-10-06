import { describe, expect, it } from "vitest";
import { createScoutBoard } from "./scout-board.ts";
import { scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";
import { dispatchQueuedScoutTrips, enqueueScoutTrip, listActiveScoutTrips } from "./scout-trip-queue.ts";
import type { ScoutTripPlan } from "./scout-trip.ts";
import type { ScoutNetworkState } from "./scout-network.ts";

const networkWith = (count: number): ScoutNetworkState => ({
  scouts: Array.from({ length: count }, (_, index) => ({
    id: `scout_${index + 1}`,
    name: `Scout ${index + 1}`,
    tier: "local" as const,
    trust: 60,
    wage_weekly: 700,
  })),
});

const plan: ScoutTripPlan = {
  id: "trip_q1",
  zone_id: "foerde",
  path_node_ids: ["n1"],
  career_club_ids_on_path: ["cl_x"],
  target_club_id: "cl_x",
  progress_multiplier: 1,
  duration: scoutTripDurationFromClubStops(1),
  queued_at_week: 1,
};

describe("dispatchQueuedScoutTrips", () => {
  it("starts a queued trip when a second scout becomes available", () => {
    const board = createScoutBoard();
    const active = {
      ...plan,
      id: "trip_a1",
      zone_id: "sh",
      assigned_scout_id: "scout_1",
      working_days_done: 1,
    };
    const withQueue = {
      ...board,
      active_scout_trips: [active],
      active_scout_trip: active,
      scout_trip_queue: [plan],
    };

    const dispatched = dispatchQueuedScoutTrips(withQueue, networkWith(1));
    expect(dispatched.scout_trip_queue).toHaveLength(1);
    expect(listActiveScoutTrips(dispatched)).toHaveLength(1);

    const afterHire = dispatchQueuedScoutTrips(withQueue, networkWith(2));
    expect(afterHire.scout_trip_queue).toHaveLength(0);
    const trips = listActiveScoutTrips(afterHire);
    expect(trips).toHaveLength(2);
    expect(trips.map((trip) => trip.assigned_scout_id).sort()).toEqual(["scout_1", "scout_2"]);
  });

  it("enqueue dispatches immediately when a scout is free", () => {
    const board = createScoutBoard();
    const next = enqueueScoutTrip(board, {
      zoneId: "foerde",
      pathNodeIds: ["n1"],
      mapNodes: [
        {
          id: "n1",
          label: "X",
          x: 1,
          y: 1,
          careerClubId: "cl_x",
          discovered: true,
          scoutable: true,
        },
      ],
      targetClubId: "cl_x",
      routeScore: {
        totalLength: 1,
        edgeSteps: 1,
        duplicateEdgeCount: 0,
        allEdgesUnique: true,
        progressMultiplier: 1,
        noDuplicateBonus: true,
      },
      week: 1,
      scouts: networkWith(1),
    });
    expect(listActiveScoutTrips(next)).toHaveLength(1);
    expect(next.scout_trip_queue).toHaveLength(0);
  });
});
