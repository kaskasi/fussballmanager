import { describe, expect, it } from "vitest";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import {
  advanceScoutWorkingDay,
  assignScout,
  createScoutBoard,
  listBoardTargets,
  type ScoutBoard,
} from "./scout-board.ts";
import { addPlayersToPool, ensureTargetsForPool, normalizeDiscovery } from "./scout-discovery.ts";
import { defaultScoutNetwork } from "./scout-network.ts";
import { finalizeScoutWorkCancellations, requestScoutWorkCancel } from "./scout-work-cancel.ts";
import { listActiveScoutTrips } from "./scout-trip-queue.ts";
import { scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";
import type { ScoutTripPlan } from "./scout-trip.ts";

describe("scout work cancel", () => {
  const rivals = initializeRivalPlayers(2026);
  const network = defaultScoutNetwork(1, 2026);

  it("marks player watch as cancelling then clears on the next working day", () => {
    let board: ScoutBoard = withPool(createScoutBoard(rivals), rivals);
    const first = listBoardTargets(board, rivals)[0]!;
    board = assignScout(board, first.player.id, network);
    const tue = { season: 1, week: 1, weekday: 2 };
    board = requestScoutWorkCancel(board, { type: "player", playerId: first.player.id }, tue);
    expect(board.targets[first.player.id]?.assigned_cancelling_since).toEqual(tue);
    expect(board.targets[first.player.id]?.assigned).toBe(true);

    const wed = { season: 1, week: 1, weekday: 3 };
    board = finalizeScoutWorkCancellations(board, wed, network);
    expect(board.targets[first.player.id]?.assigned).toBe(false);
  });

  it("drops map queue entry after cancel finalizes on working-day advance", () => {
    const plan: ScoutTripPlan = {
      id: "trip_cancel_q",
      zone_id: "foerde",
      path_node_ids: ["n1"],
      career_club_ids_on_path: ["cl_x"],
      target_club_id: "cl_x",
      progress_multiplier: 1,
      duration: scoutTripDurationFromClubStops(1),
      queued_at_week: 1,
    };
    let board: ScoutBoard = {
      ...createScoutBoard(),
      scout_trip_queue: [plan],
      active_scout_trips: [],
      active_scout_trip: null,
    };
    const mon = { season: 1, week: 1, weekday: 1 };
    board = requestScoutWorkCancel(board, { type: "map", tripId: plan.id }, mon);
    board = advanceScoutWorkingDay(board, 2, rivals, network, [], 1, 1);
    expect(listActiveScoutTrips(board)).toHaveLength(0);
    expect(board.scout_trip_queue ?? []).toHaveLength(0);
  });
});

function withPool(
  board: ScoutBoard,
  rivals: ReturnType<typeof initializeRivalPlayers>,
): ScoutBoard {
  const ids = rivals.map((player) => player.id);
  const discovery = addPlayersToPool(normalizeDiscovery(board.discovery), ids);
  const targets = ensureTargetsForPool(board.targets, discovery, rivals);
  return { ...board, discovery, targets };
}
