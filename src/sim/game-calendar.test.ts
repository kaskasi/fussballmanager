import { describe, expect, it } from "vitest";
import {
  advanceCalendarWeek,
  calendarPhaseLabel,
  calendarWeek,
  isSummerTransferWindow,
  isWinterTransferWindow,
  nextEventWeek,
  nextTransferWindowStart,
} from "./game-calendar.ts";
import { isLeagueWeek, leagueFirstWeek, leagueLastWeek, seasonEndWeek } from "./season-schedule.ts";

describe("game calendar (PRD 35: 52-week season)", () => {
  it("plays league only in league weeks, not in breaks, cup weeks or the season end", () => {
    expect(leagueFirstWeek()).toBe(7);
    expect(leagueLastWeek()).toBe(51);
    expect(isLeagueWeek(7)).toBe(true);
    expect(isLeagueWeek(leagueLastWeek())).toBe(true);
    expect(isLeagueWeek(1)).toBe(false);
    expect(isLeagueWeek(12)).toBe(false);
    expect(isLeagueWeek(26)).toBe(false);
    expect(isLeagueWeek(seasonEndWeek())).toBe(false);
  });

  it("maps season week 1 to KW 27 and matchday 1 to KW 33", () => {
    expect(calendarWeek(1)).toBe(27);
    expect(calendarWeek(3)).toBe(29);
    expect(calendarWeek(leagueFirstWeek())).toBe(33);
  });

  it("wraps past New Year in the winter break and ends in KW 26", () => {
    expect(calendarWeek(26)).toBe(52);
    expect(calendarWeek(27)).toBe(1);
    expect(calendarWeek(seasonEndWeek())).toBe(26);
  });

  it("opens summer in the pre-season (KW 29–32) and winter in KW 52, 1, 2 (PRD 05)", () => {
    expect(isSummerTransferWindow(2)).toBe(false);
    for (const week of [3, 4, 5, 6]) expect(isSummerTransferWindow(week)).toBe(true);
    expect(isSummerTransferWindow(7)).toBe(false);
    expect(isWinterTransferWindow(25)).toBe(false);
    for (const week of [26, 27, 28]) expect(isWinterTransferWindow(week)).toBe(true);
    expect(isWinterTransferWindow(29)).toBe(false);
  });

  it("finds the first week of the next window", () => {
    expect(nextTransferWindowStart(1, 7)).toEqual({ season: 1, week: 26 });
    expect(nextTransferWindowStart(1, 26)).toEqual({ season: 1, week: 27 });
    expect(nextTransferWindowStart(1, 28)).toEqual({ season: 2, week: 3 });
    expect(nextTransferWindowStart(1, 52)).toEqual({ season: 2, week: 3 });
  });

  it("ends the football season after the season-end week", () => {
    const step = advanceCalendarWeek(seasonEndWeek());
    expect(step.footballSeasonEnded).toBe(true);
    expect(step.nextWeek).toBe(1);
  });

  it("advances normally before season end", () => {
    expect(advanceCalendarWeek(10)).toEqual({ nextWeek: 11, footballSeasonEnded: false });
    expect(advanceCalendarWeek(51)).toEqual({ nextWeek: 52, footballSeasonEnded: false });
  });

  it("labels breaks and free weeks", () => {
    expect(calendarPhaseLabel(1)).toBe("Sommerpause");
    expect(calendarPhaseLabel(7)).toBe("Liga · Spieltag 1");
    expect(calendarPhaseLabel(12)).toBe("Freie Woche");
    expect(calendarPhaseLabel(seasonEndWeek())).toBe("Saisonende · Intake");
  });

  it("skips quiet weeks to the next event (PRD 35 §6)", () => {
    // Matchday 5 → free week → matchday 6: stop at matchday 6.
    expect(nextEventWeek(1, 11)).toEqual({ season: 1, week: 13 });
    // Last first-half matchday → winter break opens the winter window: stop there.
    expect(nextEventWeek(1, 25)).toEqual({ season: 1, week: 26 });
    // Season end → summer break (quiet) → pre-season opens the summer window.
    expect(nextEventWeek(1, 52)).toEqual({ season: 2, week: 3 });
    // Ordinary league week → next league week.
    expect(nextEventWeek(1, 7)).toEqual({ season: 1, week: 8 });
  });
});
