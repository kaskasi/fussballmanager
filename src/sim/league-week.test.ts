import { NORDSTERN_ID, asPlayerId, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState, totalSeasonMatchdays } from "../persistence/league-state.ts";
import {
  advanceLeagueWeek,
  playerFixture,
  simulateQuickMatchday,
  weeklySeed,
} from "./league-week.ts";
import { applyCareerMatchWeek } from "./career-match-sync.ts";
import { pyramidDivisionIds } from "./league-pyramid.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";

describe("league week", () => {
  it("plays a deterministic quick matchday", () => {
    const league = defaultLeagueState();
    const first = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    const second = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    expect(first).toEqual(second);
    expect(first.length).toBe(9);
  });

  it("advances league state offline", async () => {
    const league = defaultLeagueState();
    const advanced = await advanceLeagueWeek(league, 1, 1, 2026);
    expect(advanced.league.results.length).toBeGreaterThan(0);
    expect(advanced.league.matchday).toBe(2);
    expect(advanced.playerFixture).not.toBeNull();
    expect(advanced.league.player_stats.length).toBeGreaterThan(0);
    expect(totalSeasonMatchdays(league)).toBe(34);
  });

  it("plays every other division's matchday too, so all tables are live (PRD 32 §7)", async () => {
    const league = defaultLeagueState();
    const advanced = await advanceLeagueWeek(league, 1, 1, 2026);
    const others = Object.entries(advanced.league.division_results ?? {});
    expect(others.map(([id]) => id).sort()).toEqual(
      pyramidDivisionIds().filter((id) => id !== league.division_id).sort(),
    );
    for (const [, results] of others) expect(results).toHaveLength(9);
    expect(advanced.league.division_results?.[league.division_id]).toBeUndefined();
  });

  it("completes the season on matchday 34 and skips league play afterwards", async () => {
    const league = { ...defaultLeagueState(), matchday: 34 };
    const last = await advanceLeagueWeek(league, 1, 34, 2026);
    expect(last.seasonComplete).toBe(true);
    expect(last.league.season_complete).toBe(true);
    expect(last.league.matchday).toBe(1);
    const offseason = await advanceLeagueWeek(last.league, 1, 35, 2026);
    expect(offseason.league.results).toEqual(last.league.results);
    expect(offseason.playerFixture).toBeNull();
  });

  it("applies a watched player fixture instead of re-simming", async () => {
    const league = defaultLeagueState();
    const scheduled = playerFixture(league, league.matchday);
    expect(scheduled).toBeDefined();
    const watched = {
      homeTeamId: scheduled!.homeTeamId,
      awayTeamId: scheduled!.awayTeamId,
      homeGoals: 4,
      awayGoals: 0,
      matchday: league.matchday,
      playerClubStats: [
        {
          playerId: asPlayerId("pl_test_striker"),
          teamId: league.player_club_id,
          name: "Test Striker",
          goals: 4,
          assists: 1,
          yellowCards: 0,
        },
      ],
      fixtureStats: [
        {
          playerId: asPlayerId("pl_test_striker"),
          teamId: scheduled!.homeTeamId,
          name: "Test Striker",
          goals: scheduled!.homeTeamId === league.player_club_id ? 4 : 0,
          assists: scheduled!.homeTeamId === league.player_club_id ? 1 : 0,
          yellowCards: 0,
        },
        {
          playerId: asPlayerId("pl_opp"),
          teamId: scheduled!.awayTeamId,
          name: "Opponent",
          goals: scheduled!.awayTeamId === league.player_club_id ? 4 : 0,
          assists: scheduled!.awayTeamId === league.player_club_id ? 1 : 0,
          yellowCards: 0,
        },
      ],
    };
    const advanced = await advanceLeagueWeek(league, 1, 1, 2026, [], [], watched);
    expect(advanced.playerFixture).toEqual({
      homeTeamId: watched.homeTeamId,
      awayTeamId: watched.awayTeamId,
      homeGoals: 4,
      awayGoals: 0,
    });
    expect(advanced.clubPlayerStats).toEqual(watched.playerClubStats);
  });

  it("assigns pro minutes after a club fixture", () => {
    const player = clonePlayer();
    player.squad_status = "pro";
    const fixture = {
      homeTeamId: NORDSTERN_ID,
      awayTeamId: asTeamId("tsv-holzweg"),
      homeGoals: 2,
      awayGoals: 1,
    };
    const next = applyCareerMatchWeek([player], fixture, NORDSTERN_ID, 1, 2026, 1).players[0];
    expect(next?.state.weekly_minutes).toBeGreaterThan(50);
  });
});
