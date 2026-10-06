import { describe, expect, it } from "vitest";
import { MONDAY, SATURDAY } from "../sim/day-calendar.ts";

const TUESDAY = 2;
const FRIDAY = 5;
import {
  advanceRegionScoutOnWorkingDay,
  regionScoutTier,
  startRegionScoutJob,
} from "./scout-discovery.ts";
import { createScoutBoard, advanceScoutWorkingDay } from "./scout-board.ts";
import { defaultScoutNetwork } from "./scout-network.ts";
import { advanceActiveScoutTrip } from "./scout-trip.ts";
import { emptyDiscovery } from "./scout-discovery.ts";
import type { ActiveScoutTrip } from "./scout-trip.ts";

describe("scout working-day calendar", () => {
  it("completes region job after one Mo–Fr tick", () => {
    let board = createScoutBoard([]);
    board = startRegionScoutJob(board, "hanse");
    expect(board.active_region_scout?.working_days_left).toBe(1);
    board = advanceRegionScoutOnWorkingDay(board, TUESDAY, []);
    expect(board.active_region_scout).toBeNull();
    expect(regionScoutTier(board.discovery!, "hanse")).toBe(1);
  });

  it("does not tick region job on Saturday", () => {
    let board = startRegionScoutJob(createScoutBoard([]), "nordfries");
    board = advanceRegionScoutOnWorkingDay(board, SATURDAY, []);
    expect(board.active_region_scout?.working_days_left).toBe(1);
  });

  it("advances active trip one working day per NEXT", () => {
    const trip: ActiveScoutTrip = {
      id: "t1",
      zone_id: "sh",
      path_node_ids: ["a", "b"],
      career_club_ids_on_path: [],
      target_club_id: "cl_x",
      progress_multiplier: 1,
      duration: {
        setupWorkingDays: 1,
        scoutingWorkingDays: 1,
        teardownWorkingDays: 1,
        totalWorkingDays: 3,
      },
      queued_at_week: 1,
      assigned_scout_id: "scout_1",
      working_days_done: 0,
    };
    let board = createScoutBoard([]);
    board = { ...board, active_scout_trip: trip };
    const network = defaultScoutNetwork(1, 2026);
    board = advanceScoutWorkingDay(board, MONDAY, [], network, [], 1, 1);
    expect(board.active_scout_trip?.working_days_done).toBe(1);
    board = advanceScoutWorkingDay(board, TUESDAY, [], network, [], 1, 1);
    expect(board.active_scout_trip?.working_days_done).toBe(2);
    board = advanceScoutWorkingDay(board, FRIDAY, [], network, [], 1, 1);
    expect(board.active_scout_trip).toBeNull();
  });

  it("completes trip when working_days_done reaches total", () => {
    const trip: ActiveScoutTrip = {
      id: "t2",
      zone_id: "sh",
      path_node_ids: ["a"],
      career_club_ids_on_path: [],
      target_club_id: "cl_x",
      progress_multiplier: 1,
      duration: {
        setupWorkingDays: 1,
        scoutingWorkingDays: 0,
        teardownWorkingDays: 0,
        totalWorkingDays: 1,
      },
      queued_at_week: 1,
      assigned_scout_id: "scout_1",
      working_days_done: 0,
    };
    const result = advanceActiveScoutTrip(trip, emptyDiscovery(), [], {}, 1);
    expect(result.trip).toBeNull();
  });
});
