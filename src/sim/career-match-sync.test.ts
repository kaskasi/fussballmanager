import { NORDSTERN_ID, asPlayerId, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyCareerMatchWeek } from "./career-match-sync.ts";

describe("career match sync", () => {
  it("assigns minutes and goals to career pros after a club fixture", () => {
    const gk = clonePlayer();
    gk.id = "pl_gk";
    gk.position = "GK";
    gk.squad_status = "pro";
    gk.club_id = "cl_fc_nordstern";

    const striker = clonePlayer();
    striker.id = "pl_st";
    striker.position = "CF";
    striker.squad_status = "pro";
    striker.club_id = "cl_fc_nordstern";
    striker.attributes.shooting = 140;

    const fixture = {
      homeTeamId: NORDSTERN_ID,
      awayTeamId: asTeamId("tsv-holzweg"),
      homeGoals: 2,
      awayGoals: 1,
    };

    const result = applyCareerMatchWeek([gk, striker], fixture, NORDSTERN_ID, 3, 2026, 1);
    const played = result.players.filter((player) => player.state.season_minutes > 0);
    expect(played.length).toBeGreaterThan(0);
    expect(result.matchdayStats.length).toBeGreaterThan(0);
    const totalGoals = result.players.reduce((sum, player) => sum + player.state.season_goals, 0);
    expect(totalGoals).toBe(2);
  });

  it("uses engine match stats when provided", () => {
    const striker = clonePlayer();
    striker.id = "pl_engine_st";
    striker.position = "CF";
    striker.squad_status = "pro";
    striker.club_id = "cl_fc_nordstern";

    const fixture = {
      homeTeamId: NORDSTERN_ID,
      awayTeamId: asTeamId("tsv-holzweg"),
      homeGoals: 1,
      awayGoals: 0,
    };

    const result = applyCareerMatchWeek(
      [striker],
      fixture,
      NORDSTERN_ID,
      4,
      2026,
      1,
      [
        {
          playerId: asPlayerId("pl_engine_st"),
          teamId: NORDSTERN_ID,
          name: "Striker",
          goals: 1,
          assists: 0,
          yellowCards: 0,
        },
      ],
    );

    expect(result.players.find((player) => player.id === "pl_engine_st")?.state.season_goals).toBe(1);
  });
});
