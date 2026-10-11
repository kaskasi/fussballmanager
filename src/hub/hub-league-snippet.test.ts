import { describe, expect, it } from "vitest";
import { hubLeagueSliceRange, hubLeagueSnippet } from "./hub-league-snippet.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";

describe("hubLeagueSliceRange", () => {
  it("shows places 1–9 when player is first", () => {
    expect(hubLeagueSliceRange(18, 0)).toEqual({ start: 0, end: 9 });
  });

  it("shows last nine when player is last", () => {
    expect(hubLeagueSliceRange(18, 17)).toEqual({ start: 9, end: 18 });
  });

  it("centers nine around mid-table player", () => {
    expect(hubLeagueSliceRange(18, 8)).toEqual({ start: 4, end: 13 });
  });
});

describe("hubLeagueSnippet", () => {
  it("returns up to nine rows including the player club", () => {
    const rows = hubLeagueSnippet(defaultLeagueState());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(9);
    expect(rows.some((row) => row.isPlayerClub)).toBe(true);
  });
});
