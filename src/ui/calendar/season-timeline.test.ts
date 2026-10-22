import { asTeamId, matchdayFixtures } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { LeagueState } from "../../persistence/league-state.ts";
import { MONDAY, SATURDAY, SUNDAY } from "../../sim/day-calendar.ts";
import { civilDateFromSession } from "../../sim/session-civil-date.ts";
import {
  buildSeasonStrip,
  civilKey,
  dayPhase,
  playerMatch,
  seasonDays,
  seasonMonths,
} from "./season-timeline.ts";

function minimalLeague(): LeagueState {
  const club_ids = Array.from({ length: 18 }, (_, index) => asTeamId(`cl_${index}`));
  return {
    division_id: "regionalliga-nord",
    player_club_id: club_ids[0]!,
    club_ids,
    meetings_per_opponent: 2,
    matchday: 1,
    results: [],
    player_stats: [],
  };
}

/** Plays the player's fixture on `matchday` with the given score from the player's side. */
function withResult(league: LeagueState, matchday: number, goalsFor: number, goalsAgainst: number): LeagueState {
  const fixture = matchdayFixtures(league.club_ids, matchday).find(
    (entry) => entry.homeTeamId === league.player_club_id || entry.awayTeamId === league.player_club_id,
  )!;
  const home = fixture.homeTeamId === league.player_club_id;
  return {
    ...league,
    results: [
      ...league.results,
      {
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeGoals: home ? goalsFor : goalsAgainst,
        awayGoals: home ? goalsAgainst : goalsFor,
      },
    ],
  };
}

describe("seasonMonths", () => {
  it("runs from August to April in season order", () => {
    const months = seasonMonths(2).map((month) => month.monthIndex);
    expect(months[0]).toBe(7);
    expect(months.at(-1)).toBe(3);
    expect(months).toEqual([7, 8, 9, 10, 11, 0, 1, 2, 3]);
  });

  it("puts the spring months in the following calendar year", () => {
    const months = seasonMonths(2);
    expect(months.find((month) => month.monthIndex === 0)!.year).toBe(months[0]!.year + 1);
  });
});

describe("seasonDays / dayPhase", () => {
  it("covers pre-season only in the first season", () => {
    const preseason = civilKey(civilDateFromSession(1, -1, MONDAY));
    expect(seasonDays(1).get(preseason)).toEqual({ week: -1, weekday: MONDAY });
    expect(seasonDays(2).has(civilKey(civilDateFromSession(2, -1, MONDAY)))).toBe(false);
  });

  it("orders days around today and marks the summer break as off", () => {
    const today = { week: 5, weekday: 3 };
    expect(dayPhase({ week: 5, weekday: 2 }, today)).toBe("past");
    expect(dayPhase({ week: 4, weekday: SUNDAY }, today)).toBe("past");
    expect(dayPhase({ week: 5, weekday: 3 }, today)).toBe("today");
    expect(dayPhase({ week: 6, weekday: MONDAY }, today)).toBe("future");
    expect(dayPhase(undefined, today)).toBe("off");
  });
});

describe("playerMatch", () => {
  it("has no result before the match is played", () => {
    const match = playerMatch(minimalLeague(), 3);
    expect(match?.matchday).toBe(3);
    expect(match?.result).toBeUndefined();
  });

  it("reads the score from the player's side, home or away", () => {
    let league = minimalLeague();
    league = withResult(league, 1, 2, 1);
    league = withResult(league, 2, 0, 3);
    league = withResult(league, 3, 1, 1);
    expect(playerMatch(league, 1)?.result).toEqual({ goalsFor: 2, goalsAgainst: 1, outcome: "win" });
    expect(playerMatch(league, 2)?.result).toEqual({ goalsFor: 0, goalsAgainst: 3, outcome: "loss" });
    expect(playerMatch(league, 3)?.result?.outcome).toBe("draw");
  });

  it("ignores weeks without a league match", () => {
    expect(playerMatch(minimalLeague(), 0)).toBeUndefined();
  });
});

describe("buildSeasonStrip", () => {
  it("fills past months, part of the current month and none of the future", () => {
    const today = { week: 8, weekday: 3 };
    const todayCivil = civilDateFromSession(2, today.week, today.weekday);
    const strip = buildSeasonStrip(2, minimalLeague(), today);
    const current = strip.find((month) => month.phase === "current")!;
    expect(current.monthIndex).toBe(todayCivil.monthIndex);
    expect(current.progress).toBeGreaterThan(0);
    expect(current.progress).toBeLessThan(1);
    expect(strip.filter((month) => month.phase === "past").every((month) => month.progress === 1)).toBe(true);
    expect(strip.filter((month) => month.phase === "future").every((month) => month.progress === 0)).toBe(true);
  });

  it("lists every matchday once with its outcome when played", () => {
    const league = withResult(minimalLeague(), 1, 3, 0);
    const strip = buildSeasonStrip(2, league, { week: 2, weekday: MONDAY });
    const matches = strip.flatMap((month) => month.matches);
    expect(matches).toHaveLength(34);
    expect(matches[0]).toEqual({ matchday: 1, outcome: "win" });
    expect(matches[1]).toEqual({ matchday: 2, outcome: null });
    const sat = civilDateFromSession(2, 1, SATURDAY);
    const month = strip.find((entry) => entry.monthIndex === sat.monthIndex && entry.year === sat.year)!;
    expect(month.matches.some((entry) => entry.matchday === 1)).toBe(true);
  });
});
