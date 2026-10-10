import { describe, expect, it } from "vitest";
import { NORDSTERN_ID, asPlayerId, asTeamId } from "@fussballmanager/shared";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyRivalMatchdayStats } from "./rival-matchday-stats.ts";

describe("rival matchday stats", () => {
  it("adds engine goals and assists to rival players", () => {
    const rival = clonePlayer();
    rival.id = "rp_eck_9";
    rival.club_id = "cl_eck";
    rival.state.season_goals = 2;
    rival.state.season_assists = 0;

    const next = applyRivalMatchdayStats(
      [rival],
      [
        {
          playerId: asPlayerId("rp_eck_9"),
          teamId: asTeamId("eck"),
          name: "Striker",
          goals: 2,
          assists: 1,
          yellowCards: 1,
        },
      ],
      NORDSTERN_ID,
    )[0]!;

    expect(next.state.season_goals).toBe(4);
    expect(next.state.season_assists).toBe(1);
    expect(next.state.season_yellow_cards).toBe(1);
  });

  it("ignores manager club rows", () => {
    const rival = clonePlayer();
    rival.id = "rp_eck_9";
    const next = applyRivalMatchdayStats(
      [rival],
      [
        {
          playerId: asPlayerId("pl_home"),
          teamId: NORDSTERN_ID,
          name: "Us",
          goals: 5,
          assists: 0,
          yellowCards: 0,
        },
      ],
      NORDSTERN_ID,
    )[0]!;
    expect(next.state.season_goals).toBe(0);
  });
});
