import { asTeamId, matchdayFixtures } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { LeagueState } from "../../persistence/league-state.ts";
import { civilDateFromSession } from "../../sim/session-civil-date.ts";
import { SATURDAY } from "../../sim/day-calendar.ts";
import { buildMonthGrid } from "./month-grid.ts";

function minimalLeague(): LeagueState {
  const club_ids = Array.from({ length: 18 }, (_, index) => asTeamId(`cl_${index}`));
  return {
    division_id: "regionalliga-nord",
    player_club_id: club_ids[0]!,
    club_ids,
    meetings_per_opponent: 2,
    matchday: 2,
    results: [],
    player_stats: [],
  };
}

describe("buildMonthGrid", () => {
  it("shows at most one match chip per season week in September", () => {
    const league = minimalLeague();
    const cells = buildMonthGrid(1, 8, league);
    const withMatch = cells.filter((cell) => cell.match);
    const sat = civilDateFromSession(1, 2, SATURDAY);
    const week2Chips = withMatch.filter(
      (cell) =>
        cell.day !== null &&
        cell.day === sat.day &&
        sat.monthIndex === 8,
    );
    expect(week2Chips.length).toBe(1);
  });

  it("places Spieltag 2 on its league Saturday in September", () => {
    const league = minimalLeague();
    const cells = buildMonthGrid(1, 8, league);
    const sat = civilDateFromSession(1, 2, SATURDAY);
    const saturdayCell = cells.find((cell) => cell.day === sat.day);
    expect(saturdayCell?.match).toBeDefined();
    const neighbors = cells.filter(
      (cell) =>
        cell.day !== null &&
        cell.day !== sat.day &&
        Math.abs(cell.day - sat.day) <= 2,
    );
    expect(neighbors.every((cell) => !cell.match)).toBe(true);
  });

  it("shows spring matchdays in February of the following calendar year", () => {
    const league = { ...minimalLeague(), matchday: 24 };
    const sat = civilDateFromSession(2, 24, SATURDAY);
    expect(sat.monthIndex).toBe(1);
    const cells = buildMonthGrid(2, sat.monthIndex, league);
    const chip = cells.find((cell) => cell.day === sat.day && cell.match);
    expect(chip?.match).toBeDefined();
  });
});

describe("buildMonthGrid — time", () => {
  it("marks days before today as past, today, then future", () => {
    const league = minimalLeague();
    const today = { week: 5, weekday: 3 };
    const civil = civilDateFromSession(1, today.week, today.weekday);
    const cells = buildMonthGrid(1, civil.monthIndex, league, today);
    const todayCell = cells.find((cell) => cell.day === civil.day)!;
    expect(todayCell.phase).toBe("today");
    expect(todayCell.session).toEqual(today);
    expect(cells.find((cell) => cell.day === civil.day - 1)?.phase).toBe("past");
    expect(cells.find((cell) => cell.day === civil.day + 1)?.phase).toBe("future");
  });

  it("marks summer-break days in August as off", () => {
    const cells = buildMonthGrid(2, 7, minimalLeague(), { week: 1, weekday: 1 });
    expect(cells.find((cell) => cell.day === 1)?.phase).toBe("off");
  });

  it("shows the score on a played matchday", () => {
    const league = minimalLeague();
    const fixture = matchdayFixtures(league.club_ids, 1).find(
      (entry) => entry.homeTeamId === league.player_club_id || entry.awayTeamId === league.player_club_id,
    )!;
    const home = fixture.homeTeamId === league.player_club_id;
    const played: LeagueState = {
      ...league,
      results: [{ ...fixture, homeGoals: home ? 2 : 0, awayGoals: home ? 0 : 2 }],
    };
    const sat = civilDateFromSession(1, 1, SATURDAY);
    const cell = buildMonthGrid(1, sat.monthIndex, played).find((entry) => entry.day === sat.day)!;
    expect(cell.match?.result).toEqual({ goalsFor: 2, goalsAgainst: 0, outcome: "win" });
    expect(cell.match?.home).toBe(home);
  });
});

describe("buildMonthGrid — transfer windows", () => {
  it("follows the game's summer window weeks and closes on the Sunday of Spieltag 2", () => {
    const lastDay = civilDateFromSession(1, 2, 7);
    const cells = buildMonthGrid(1, lastDay.monthIndex, minimalLeague());
    const closing = cells.find((cell) => cell.day === lastDay.day)!;
    expect(closing.transferWindow).toBe("summer");
    expect(closing.transferLastDay).toBe(true);
    const after = civilDateFromSession(1, 3, 1);
    const afterCell = buildMonthGrid(1, after.monthIndex, minimalLeague()).find((cell) => cell.day === after.day)!;
    expect(afterCell.transferWindow).toBeUndefined();
  });

  it("has no window in the summer break", () => {
    const cells = buildMonthGrid(2, 7, minimalLeague());
    expect(cells.find((cell) => cell.day === 1)?.transferWindow).toBeUndefined();
  });
});
