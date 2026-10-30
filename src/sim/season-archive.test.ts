import { describe, expect, it } from "vitest";
import { defaultLeagueState, type LeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "./league-divisions.ts";
import { PYRAMID } from "./league-pyramid.ts";
import { applyPromotionRelegation, simulateFullDivisionSeason } from "./promotion-relegation.ts";
import { seasonArchiveEntry } from "./season-archive.ts";

describe("season archive (PRD 32 §8)", () => {
  it("records every division's table, champion and movements, and the manager's season", () => {
    const pools = defaultLeaguePools();
    const base = defaultLeagueState();
    const division_results = Object.fromEntries(
      PYRAMID.filter((division) => division.id !== base.division_id).map((division) => [
        division.id,
        simulateFullDivisionSeason(pools[division.id], 2, 900 + division.tier),
      ]),
    );
    const league: LeagueState = {
      ...base,
      results: simulateFullDivisionSeason(base.club_ids, 2, 77),
      division_results,
      season_complete: true,
    };
    const movement = applyPromotionRelegation(league, pools, 2026, 4);
    const entry = seasonArchiveEntry(4, league, movement);

    expect(entry.season).toBe(4);
    expect(entry.divisions.map((division) => division.id)).toEqual(PYRAMID.map((division) => division.id));
    for (const division of entry.divisions) {
      expect(division.table).toHaveLength(18);
      expect(division.champion).toBe(division.table[0]![0]);
      expect(division.table.every((row) => row[1] === 34)).toBe(true);
    }
    const nationalliga = entry.divisions.find((division) => division.id === "nationalliga")!;
    // Two direct places, plus the playoff when the Nationalliga's 3rd wins it.
    const playoffWon = movement.movements.some((move) => move.from === "nationalliga" && move.reason === "playoff_won");
    expect(nationalliga.promoted).toHaveLength(playoffWon ? 3 : 2);
    expect(entry.divisions.at(-1)!.playoff).toBeNull();
    expect(entry.own.division).toBe(base.division_id);
    expect(entry.own.results).toHaveLength(34);
    expect(entry.own.place).toBeGreaterThan(0);
    expect(JSON.stringify(entry).length).toBeLessThan(12_000);
  });
});
