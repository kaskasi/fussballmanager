import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState, totalSeasonMatchdays } from "../persistence/league-state.ts";
import {
  advanceLeagueWeek,
  leagueTable,
  playerFixture,
  simulateQuickMatchday,
  weeklySeed,
} from "./league-week.ts";
import { applyCareerMatchWeek } from "./career-match-sync.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";

describe("league week", () => {
  it("plays a deterministic quick matchday", () => {
    const league = defaultLeagueState();
    const first = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    const second = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    expect(first).toEqual(second);
    expect(first.length).toBe(3);
  });

  it("advances league state offline", async () => {
    const league = defaultLeagueState();
    const advanced = await advanceLeagueWeek(league, 1, 1, 2026);
    expect(advanced.league.results.length).toBeGreaterThan(0);
    expect(advanced.league.matchday).toBe(2);
    expect(advanced.playerFixture).not.toBeNull();
    expect(advanced.league.player_stats.length).toBeGreaterThan(0);
    expect(totalSeasonMatchdays(league)).toBe(30);
  });

  it("skips league play after matchday 30 and during the postseason", async () => {
    let league = defaultLeagueState();
    for (let week = 1; week <= 30; week++) {
      const step = await advanceLeagueWeek(league, 1, week, 2026);
      league = step.league;
    }
    const offseason = await advanceLeagueWeek(league, 1, 31, 2026);
    expect(offseason.league.results.length).toBe(30 * 3);
    expect(offseason.league.matchday).toBe(1);
    expect(offseason.playerFixture).toBeNull();
  });

  it("completes the season after 30 matchdays with 30 games per club", async () => {
    let league = defaultLeagueState();
    let seasonComplete = false;
    for (let week = 1; week <= 30; week++) {
      const step = await advanceLeagueWeek(league, 1, week, 2026);
      league = step.league;
      seasonComplete = step.seasonComplete;
    }
    expect(seasonComplete).toBe(true);
    expect(league.season_complete).toBe(true);
    const table = leagueTable(league);
    expect(table.every((row) => row.played === 30)).toBe(true);
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
    };
    const advanced = await advanceLeagueWeek(league, 1, 1, 2026, [], [], watched);
    expect(advanced.playerFixture).toEqual({
      homeTeamId: watched.homeTeamId,
      awayTeamId: watched.awayTeamId,
      homeGoals: 4,
      awayGoals: 0,
    });
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
