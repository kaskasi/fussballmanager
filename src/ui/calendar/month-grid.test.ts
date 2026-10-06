import { asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { LeagueState } from "../../persistence/league-state.ts";
import { buildMonthGrid, seasonWeekForMonthDay } from "./month-grid.ts";

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
    const week2Chips = withMatch.filter(
      (cell) => cell.day !== null && seasonWeekForMonthDay(8, cell.day) === 2,
    );
    expect(week2Chips.length).toBe(1);
  });

  it("does not repeat the same fixture on every day of the week band", () => {
    const league = minimalLeague();
    const cells = buildMonthGrid(1, 8, league);
    const week2Days = cells.filter(
      (cell) => cell.day !== null && seasonWeekForMonthDay(8, cell.day!) === 2,
    );
    const withChip = week2Days.filter((cell) => cell.match);
    expect(week2Days.length).toBeGreaterThan(1);
    expect(withChip.length).toBe(1);
  });
});
