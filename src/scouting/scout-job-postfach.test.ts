import { describe, expect, it } from "vitest";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import {
  advanceScoutWeek,
  createScoutBoard,
} from "./scout-board.ts";
import {
  appendScoutJobNotices,
  consumeScoutJobNotice,
  opponentScoutNoticeForMatch,
  unconsumedScoutJobNotices,
} from "./scout-job-postfach.ts";
import { emptyDiscovery } from "./scout-discovery.ts";

describe("scout job postfach", () => {
  it("enqueues a club job completion notice when roster enters pool", () => {
    const rivals = initializeRivalPlayers(2026);
    const sample = rivals.find((player) => player.club_id && player.squad_status === "pro");
    expect(sample?.club_id).toBeDefined();
    const clubId = sample!.club_id!;

    let board = createScoutBoard();
    board = {
      ...board,
      active_club_scout: { club_id: clubId, progress: 90 },
      discovery: emptyDiscovery(),
    };

    const next = advanceScoutWeek(board, 3, rivals, [], undefined, 1);
    const notices = unconsumedScoutJobNotices(next);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.kind).toBe("club_complete");
    expect(notices[0]?.careerClubId).toBe(clubId);
    expect(notices[0]?.playersAdded).toBeGreaterThan(0);

    const dismissed = consumeScoutJobNotice(next, notices[0]!.id);
    expect(unconsumedScoutJobNotices(dismissed)).toHaveLength(0);
  });

  it("keeps opponent analysis reports out of the inbox but findable for the Tactics screen", () => {
    const board = appendScoutJobNotices(createScoutBoard(), [
      {
        id: "opp-1",
        kind: "opponent_scout_complete",
        season: 1,
        week: 3,
        consumed: false,
        matchId: "s1_w3_md3_a_b",
      },
    ]);
    expect(unconsumedScoutJobNotices(board)).toHaveLength(0);
    expect(opponentScoutNoticeForMatch(board, "s1_w3_md3_a_b")?.id).toBe("opp-1");
  });
});
