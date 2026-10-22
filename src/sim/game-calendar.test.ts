import { describe, expect, it } from "vitest";
import {
  advanceCalendarWeek,
  calendarWeek,
  isLeagueMatchWeek,
  isSummerTransferWindow,
  isWinterTransferWindow,
  LEAGUE_LAST_WEEK,
  nextTransferWindowStart,
  SEASON_END_WEEK,
} from "./game-calendar.ts";

describe("game calendar", () => {
  it("plays league on weeks 1-34 only", () => {
    expect(isLeagueMatchWeek(1)).toBe(true);
    expect(isLeagueMatchWeek(LEAGUE_LAST_WEEK)).toBe(true);
    expect(isLeagueMatchWeek(31)).toBe(true);
    expect(isLeagueMatchWeek(35)).toBe(false);
  });

  it("maps preseason weeks before Spieltag 1 (KW 35)", () => {
    expect(calendarWeek(-1)).toBe(33);
    expect(calendarWeek(0)).toBe(34);
    expect(calendarWeek(1)).toBe(35);
  });

  it("puts Spieltag 1 in late August and wraps past New Year", () => {
    expect(calendarWeek(1)).toBe(35);
    expect(calendarWeek(2)).toBe(36);
    expect(calendarWeek(18)).toBe(52);
    expect(calendarWeek(19)).toBe(1);
    expect(calendarWeek(20)).toBe(2);
    expect(calendarWeek(34)).toBe(16);
  });

  it("opens summer KW 33–36 and winter KW 2–4 (PRD 05)", () => {
    expect(isSummerTransferWindow(-1)).toBe(true);
    expect(isSummerTransferWindow(0)).toBe(true);
    expect(isSummerTransferWindow(1)).toBe(true);
    expect(isSummerTransferWindow(2)).toBe(true);
    expect(isSummerTransferWindow(3)).toBe(false);
    expect(isWinterTransferWindow(19)).toBe(false);
    expect(isWinterTransferWindow(20)).toBe(true);
    expect(isWinterTransferWindow(22)).toBe(true);
    expect(isWinterTransferWindow(23)).toBe(false);
    expect(isWinterTransferWindow(3)).toBe(false);
  });

  it("finds the first week of the next window", () => {
    expect(nextTransferWindowStart(1, 3)).toEqual({ season: 1, week: 20 });
    expect(nextTransferWindowStart(1, 19)).toEqual({ season: 1, week: 20 });
    expect(nextTransferWindowStart(1, 23)).toEqual({ season: 2, week: 1 });
    expect(nextTransferWindowStart(1, 34)).toEqual({ season: 2, week: 1 });
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
