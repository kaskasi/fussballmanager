import { describe, expect, it } from "vitest";
import type { FixtureResult } from "@fussballmanager/shared";
import { defaultLeagueState, type LeagueState } from "../persistence/league-state.ts";
import { defaultBoardState, type BoardState } from "./board-state.ts";
import {
  BOARD_DISMISS_GRACE_MATCHDAYS,
  BOARD_WARNING_PRESSURE,
  startBoardSeason,
  updateInSeasonPressure,
} from "./season-objectives.ts";

const SEASON = 2026;

/** Every club plays each matchday; the player club loses (or wins) every game. */
function leagueAfter(matchdays: number, playerWins: boolean): LeagueState {
  const league = defaultLeagueState();
  const others = league.club_ids.filter((id) => id !== league.player_club_id);
  const results: FixtureResult[] = [];
  for (let md = 0; md < matchdays; md++) {
    const opponent = others[md % others.length]!;
    results.push({
      homeTeamId: league.player_club_id,
      awayTeamId: opponent,
      homeGoals: playerWins ? 2 : 0,
      awayGoals: playerWins ? 0 : 2,
    });
    const rest = others.filter((id) => id !== opponent);
    for (let i = 0; i + 1 < rest.length; i += 2) {
      results.push({ homeTeamId: rest[i]!, awayTeamId: rest[i + 1]!, homeGoals: 1, awayGoals: 1 });
    }
  }
  return { ...league, results, matchday: matchdays + 1 };
}

function seasonBoard(): BoardState {
  const league = defaultLeagueState();
  return startBoardSeason(defaultBoardState(league.player_club_id), league.player_club_id, SEASON, league);
}

function runWeeks(weeks: number, playerWins: boolean, start = seasonBoard()) {
  let board = start;
  const steps = [];
  for (let md = 1; md <= weeks; md++) {
    const step = updateInSeasonPressure(board, leagueAfter(md, playerWins), SEASON);
    board = step.board;
    steps.push(step);
  }
  return { board, steps };
}

describe("in-season board pressure", () => {
  it("builds pressure while the club sits below its place target", () => {
    const { board } = runWeeks(6, false);
    expect(board.pressure).toBeGreaterThan(20);
    expect(board.job_status).toBe("employed");
  });

  it("eases pressure while the club is on track", () => {
    const start = { ...seasonBoard(), pressure: 30 };
    const { board } = runWeeks(4, true, start);
    expect(board.pressure).toBeLessThan(30);
  });

  it("sends one warning letter, then sacks after the grace period", () => {
    const { board, steps } = runWeeks(30, false);
    const warnings = steps.filter((step) => step.warning);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.board.pressure).toBeGreaterThanOrEqual(BOARD_WARNING_PRESSURE);
    const sacked = steps.find((step) => step.dismissed);
    expect(sacked).toBeDefined();
    expect(sacked!.matchdaysPlayed).toBeGreaterThanOrEqual(BOARD_DISMISS_GRACE_MATCHDAYS);
    expect(board.job_status).toBe("dismissed");
  });
});
