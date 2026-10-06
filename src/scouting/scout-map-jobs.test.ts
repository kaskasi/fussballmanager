import { describe, expect, it } from "vitest";
import { listMapScoutJobs } from "./scout-map-jobs.ts";
import { scoutTripDuration } from "./scout-trip-duration.ts";
import type { ScoutTripPlan } from "./scout-trip.ts";

describe("listMapScoutJobs", () => {
  it("lists active job with scout and queued job without", () => {
    const plan: ScoutTripPlan = {
      id: "trip_1",
      zone_id: "sh",
      path_node_ids: ["a", "b"],
      career_club_ids_on_path: ["cl_world_a"],
      target_club_id: "cl_world_a",
      progress_multiplier: 1,
      duration: scoutTripDuration("sh", 2),
      queued_at_week: 3,
    };
    const rows = listMapScoutJobs({
      activeTrip: { ...plan, assigned_scout_id: "scout_1", working_days_done: 1 },
      queue: [
        {
          ...plan,
          id: "trip_2",
          target_club_id: "cl_world_b",
        },
      ],
      network: {
        scouts: [{ id: "scout_1", name: "Lars Krüger", tier: "local", trust: 60, wage_weekly: 700 }],
      },
      worldClubs: [
        {
          id: "world-a",
          name: "FC Test",
          short_name: "TST",
          place: "Kiel",
          region: "Fördeküste",
          division_id: "oberliga-nord",
          identity: "community",
          reputation: 40,
          rivalry_ids: [],
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe("active");
    expect(rows[0]?.assignedScoutName).toBe("Lars Krüger");
    expect(rows[1]?.status).toBe("queued");
    expect(rows[1]?.assignedScoutName).toBeNull();
  });
});
