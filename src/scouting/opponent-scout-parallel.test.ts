import { describe, expect, it } from "vitest";
import { createScoutBoard } from "./scout-board.ts";
import { defaultScoutNetwork } from "./scout-network.ts";
import { canStartOpponentScout, startOpponentScoutJob } from "./opponent-scout-job.ts";
import { scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { asTeamId } from "@fussballmanager/shared";

const setup: CareerMatchSetup = {
  seed: 1,
  matchday: 1,
  calendarWeek: 1,
  fixture: { id: "f", matchday: 1, homeTeamId: asTeamId("a"), awayTeamId: asTeamId("b") },
  homeTeamId: asTeamId("a"),
  awayTeamId: asTeamId("b"),
  playerClubId: asTeamId("a"),
  opponentShortName: "TST",
  isHome: true,
};

describe("opponent scout parallel jobs", () => {
  it("starts opponent prep while another scout is on a map trip", () => {
    const board = createScoutBoard();
    board.active_scout_trip = {
      id: "trip_test",
      zone_id: "sh",
      path_node_ids: ["n1"],
      career_club_ids_on_path: ["cl_rival"],
      target_club_id: "cl_rival",
      progress_multiplier: 1,
      duration: scoutTripDurationFromClubStops(3, "sh"),
      queued_at_week: 1,
      assigned_scout_id: "scout_a",
      working_days_done: 0,
    };
    const network = {
      ...defaultScoutNetwork(1, 99),
      scouts: [
        { id: "scout_a", name: "A", tier: "local" as const, trust: 70, wage_weekly: 700 },
        { id: "scout_b", name: "B", tier: "local" as const, trust: 60, wage_weekly: 700 },
      ],
    };

    expect(canStartOpponentScout(board, network, setup, 1).ok).toBe(true);

    const started = startOpponentScoutJob(board, network, setup, 1, 12);
    expect(started.reason).toBe("ok");
    expect(started.board.active_opponent_scout?.assigned_scout_id).toBe("scout_b");
  });
});
