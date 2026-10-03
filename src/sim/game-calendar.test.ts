import { describe, expect, it } from "vitest";
import {
  advanceCalendarWeek,
  calendarWeek,
  isLeagueMatchWeek,
  isSummerTransferWindow,
  isWinterTransferWindow,
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

  it("puts Spieltag 1 in late August and wraps past New Year", () => {
    expect(calendarWeek(1)).toBe(35);
    expect(calendarWeek(2)).toBe(36);
    expect(calendarWeek(18)).toBe(52);
    expect(calendarWeek(19)).toBe(1);
    expect(calendarWeek(20)).toBe(2);
    expect(calendarWeek(34)).toBe(16);
  });

  it("opens the summer window at season start, winter in January", () => {
    expect(isSummerTransferWindow(1)).toBe(true);
    expect(isSummerTransferWindow(2)).toBe(true);
    expect(isSummerTransferWindow(3)).toBe(false);
    expect(isWinterTransferWindow(20)).toBe(true);
    expect(isWinterTransferWindow(22)).toBe(true);
    expect(isWinterTransferWindow(3)).toBe(false);
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
