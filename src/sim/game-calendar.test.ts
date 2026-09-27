import { describe, expect, it } from "vitest";
import {
  advanceCalendarWeek,
  isLeagueMatchWeek,
  LEAGUE_LAST_WEEK,
  SEASON_END_WEEK,
} from "./game-calendar.ts";

describe("game calendar", () => {
  it("plays league on weeks 1-34 only", () => {
    expect(isLeagueMatchWeek(1)).toBe(true);
    expect(isLeagueMatchWeek(LEAGUE_LAST_WEEK)).toBe(true);
    expect(isLeagueMatchWeek(31)).toBe(true);
    expect(isLeagueMatchWeek(35)).toBe(false);
  });

  it("ends the football season after week 34", () => {
    const step = advanceCalendarWeek(SEASON_END_WEEK);
    expect(step.footballSeasonEnded).toBe(true);
    expect(step.nextWeek).toBe(1);
  });

  it("advances normally before season end", () => {
    expect(advanceCalendarWeek(10)).toEqual({ nextWeek: 11, footballSeasonEnded: false });
  });
});
