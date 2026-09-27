import { asPlayerId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { computeSeasonAwards } from "./season-awards.ts";

describe("season-awards", () => {
  it("builds award cards from league stats", () => {
    const league = defaultLeagueState();
    league.career_player_stats = [
      {
        playerId: "pl_1",
        name: "Max Stürmer",
        goals: 14,
        assists: 4,
        yellowCards: 1,
        minutes: 2400,
        apps: 30,
      },
    ];
    league.player_stats = [
      {
        playerId: asPlayerId("eng_1"),
        teamId: league.club_ids[1]!,
        name: "Rival Striker",
        goals: 9,
        assists: 2,
        yellowCards: 3,
      },
    ];
    const player = clonePlayer();
    player.id = "pl_1";
    player.state.season_minutes = 2400;
    player.state.season_goals = 14;
    player.state.season_assists = 4;
    const snapshot = computeSeasonAwards(league, [player], [], 1);
    expect(snapshot.awards.some((award) => award.kind === "top_scorer")).toBe(true);
    expect(snapshot.awards[0]?.playerName).toBeTruthy();
  });
});
