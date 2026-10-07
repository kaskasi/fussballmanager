import { describe, expect, it } from "vitest";
import { createScoutAssignment } from "./scout-assignments.ts";
import { buildScoutWorkTiles } from "./scout-work-overview.ts";
import { defaultScoutNetwork } from "./scout-network.ts";

describe("buildScoutWorkTiles", () => {
  it("renders filter assignments as grid tiles, not a separate list", () => {
    const assignment = createScoutAssignment(
      "a1",
      { age: "28+", position: "CB", query: "Hansestadt" },
      undefined,
      { kind: "filter_sweep", weeksRemaining: 1 },
    );
    const tiles = buildScoutWorkTiles({
      targets: [],
      assignments: [assignment],
      activeTrips: [],
      tripQueue: [],
      network: defaultScoutNetwork(1, 2026),
      worldClubs: [],
    });
    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.kind).toBe("filter_assignment");
    expect(tiles[0]?.assignmentId).toBe("a1");
    expect(tiles[0]?.status).toBe("active");
  });

  it("includes active opponent scout job", () => {
    const tiles = buildScoutWorkTiles({
      targets: [],
      assignments: [],
      activeTrips: [],
      tripQueue: [],
      activeOpponentScout: {
        match_id: "m1",
        assigned_scout_id: "scout_1",
        working_days_done: 1,
        working_days_total: 3,
        season: 1,
        week: 12,
      },
      opponentLabel: "SV Test",
      network: defaultScoutNetwork(1, 2026),
      worldClubs: [],
    });
    expect(tiles.some((tile) => tile.kind === "opponent_job")).toBe(true);
    expect(tiles.find((tile) => tile.kind === "opponent_job")?.title).toBe("SV Test");
  });
});
