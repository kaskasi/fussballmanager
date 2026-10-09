import { describe, expect, it, vi } from "vitest";
import * as opponentBundle from "./opponent-scout-bundle.ts";
import { MONDAY } from "../sim/day-calendar.ts";
import { createScoutBoard, advanceScoutWorkingDay } from "./scout-board.ts";
import { defaultScoutNetwork } from "./scout-network.ts";
import {
  advanceOpponentScoutOnWorkingDay,
  startOpponentScoutJob,
} from "./opponent-scout-job.ts";
import { OPPONENT_SCOUT_WORKING_DAYS } from "./opponent-scout-sims.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { asTeamId } from "@fussballmanager/shared";

const setup: CareerMatchSetup = {
  seed: 99,
  matchday: 3,
  calendarWeek: 12,
  fixture: {
    id: "test-fixture",
    matchday: 3,
    homeTeamId: asTeamId("a"),
    awayTeamId: asTeamId("b"),
  },
  homeTeamId: asTeamId("a"),
  awayTeamId: asTeamId("b"),
  playerClubId: asTeamId("a"),
  opponentShortName: "RIV",
  isHome: true,
};

describe("opponent scout job (PRD 22)", () => {
  it("blocks scout for OPPONENT_SCOUT_WORKING_DAYS then queues Postfach notice", () => {
    vi.spyOn(opponentBundle, "buildOpponentScoutVariants").mockReturnValue({
      variants: Array.from({ length: 10 }, (_, index) => ({
        variantIndex: index,
        seed: index,
        homeScore: 2,
        awayScore: 1,
        eventCount: 50,
        formationLabel: index < 5 ? "4-3-3" : "4-4-2",
        risk: "balanced",
        goalsFor: 2,
        goalsAgainst: 1,
      })),
      variantPlans: [],
    });
    const network = defaultScoutNetwork(1, 99);
    let board = createScoutBoard();
    const started = startOpponentScoutJob(board, network, setup, 1, 12);
    expect(started.reason).toBe("ok");
    board = started.board;
    expect(board.active_opponent_scout?.working_days_done).toBe(0);

    for (let day = 0; day < OPPONENT_SCOUT_WORKING_DAYS - 1; day += 1) {
      board = advanceOpponentScoutOnWorkingDay(board, network, null);
      expect(board.active_opponent_scout?.working_days_done).toBe(day + 1);
    }

    board = advanceScoutWorkingDay(board, MONDAY, [], network, [], 1, 12, undefined, {
      masterSeed: 1,
      setup,
      players: [],
      rivalPlayers: [],
      tacticsPresets: [],
      opponentShortName: "RIV",
    });

    expect(board.active_opponent_scout).toBeNull();
    const notice = board.discovery_postfach_queue?.find((entry) => entry.kind === "opponent_scout_complete");
    expect(notice).toBeDefined();
    expect(notice?.report?.recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
