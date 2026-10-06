import { describe, expect, it } from "vitest";
import type { ScoutMapNode } from "./scout-map-layout.ts";
import { scoutMarkerAtTripProgress, tripsForZone } from "./scout-trip-map-viz.ts";
import { scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";

const nodes: ScoutMapNode[] = [
  { id: "cl_a", label: "A", x: 10, y: 10, careerClubId: "cl_a", discovered: false, scoutable: true },
  { id: "cl_b", label: "B", x: 20, y: 20, careerClubId: "cl_b", discovered: false, scoutable: true },
];

describe("scout-trip-map-viz", () => {
  it("filters active and queued trips by zone", () => {
    const queued: ScoutTripPlan = {
      id: "q1",
      zone_id: "foerde",
      path_node_ids: ["cl_a"],
      career_club_ids_on_path: ["cl_a"],
      target_club_id: "cl_a",
      progress_multiplier: 1,
      duration: scoutTripDurationFromClubStops(1),
      queued_at_week: 1,
    };
    const active = { ...queued, id: "a1", zone_id: "sh", assigned_scout_id: "s1", working_days_done: 0 };
    const layers = tripsForZone("sh", [active], [queued]);
    expect(layers.active?.id).toBe("a1");
    expect(layers.actives).toHaveLength(1);
    expect(layers.queued).toHaveLength(0);
    const foerde = tripsForZone("foerde", [active], [queued]);
    expect(foerde.active).toBeNull();
    expect(foerde.queued).toHaveLength(1);
  });

  it("places scout marker on first club before first day completes", () => {
    const trip: ActiveScoutTrip = {
      id: "t1",
      zone_id: "sh",
      path_node_ids: ["cl_a", "cl_b"],
      career_club_ids_on_path: ["cl_a", "cl_b"],
      target_club_id: "cl_b",
      progress_multiplier: 1,
      duration: scoutTripDurationFromClubStops(2),
      queued_at_week: 1,
      assigned_scout_id: "s1",
      working_days_done: 0,
    };
    expect(scoutMarkerAtTripProgress(trip, nodes)).toEqual({ x: 10, y: 10 });
    expect(scoutMarkerAtTripProgress({ ...trip, working_days_done: 1 }, nodes)).toEqual({
      x: 10,
      y: 10,
    });
    expect(scoutMarkerAtTripProgress({ ...trip, working_days_done: 2 }, nodes)).toEqual({
      x: 20,
      y: 20,
    });
  });
});
