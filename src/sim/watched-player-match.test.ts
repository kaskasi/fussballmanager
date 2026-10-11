import { describe, expect, it } from "vitest";
import { NORDSTERN_ID, asPlayerId, asTeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "./career-match-setup.ts";
import { watchedMatchFromView } from "./watched-player-match.ts";

describe("watched-player-match", () => {
  it("carries manager-club stats from the match report", () => {
    const setup: CareerMatchSetup = {
      seed: 1,
      matchday: 22,
      calendarWeek: 22,
      fixture: {
        id: "fixture-md22-eck-nord",
        homeTeamId: asTeamId("eck"),
        awayTeamId: NORDSTERN_ID,
        matchday: 22,
      },
      homeTeamId: asTeamId("eck"),
      awayTeamId: NORDSTERN_ID,
      playerClubId: NORDSTERN_ID,
      opponentShortName: "ECK",
      isHome: false,
    };

    const outcome = watchedMatchFromView(setup, {
      finalScore: { home: 2, away: 7 },
      report: {
        conditions: { referee: "Test", weather: "Windig" },
        goals: [],
        cards: [],
        playerStats: [
          {
            playerId: asPlayerId("pl_wojcik"),
            teamId: NORDSTERN_ID,
            name: "Mateusz Wójcik",
            goals: 4,
            assists: 0,
            yellowCards: 0,
          },
          {
            playerId: asPlayerId("pl_rival"),
            teamId: asTeamId("eck"),
            name: "Rival Striker",
            goals: 2,
            assists: 0,
            yellowCards: 0,
          },
        ],
      },
    } as unknown as Parameters<typeof watchedMatchFromView>[1]);

    expect(outcome.homeGoals).toBe(2);
    expect(outcome.awayGoals).toBe(7);
    expect(outcome.fixtureStats).toHaveLength(2);
    expect(outcome.playerClubStats).toHaveLength(1);
    expect(outcome.playerClubStats?.[0]?.goals).toBe(4);
  });
});
