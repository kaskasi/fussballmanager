import { asTeamId } from "@fussballmanager/shared";
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
