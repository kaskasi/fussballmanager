import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { MONDAY, resolveSmartSkip, SATURDAY, SUNDAY } from "./day-calendar.ts";

describe("day calendar smart skip", () => {
  it("stops on the current weekday when the inbox has pending decisions", () => {
    const session = newGameSession();
    session.weekday = MONDAY;
    expect(resolveSmartSkip(session, true)).toEqual({
      weekday: MONDAY,
      action: "inbox",
      daysAdvanced: 0,
    });
    session.weekday = 3;
    expect(resolveSmartSkip(session, true)).toEqual({
      weekday: 3,
      action: "inbox",
      daysAdvanced: 0,
    });
  });

  it("advances one weekday at a time on a league match week until Saturday", () => {
    const session = newGameSession();
    session.week = 3;
    session.weekday = MONDAY;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: 2,
      action: "advance",
      daysAdvanced: 1,
    });
    session.weekday = 5;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SATURDAY,
      action: "advance",
      daysAdvanced: 1,
    });
    session.weekday = SATURDAY;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SATURDAY,
      action: "match",
      daysAdvanced: 0,
    });
  });

  it("steps past Saturday when the league season is already complete", () => {
    const session = newGameSession();
    session.week = 16;
    session.weekday = SATURDAY;
    session.matchPlayedThisWeek = false;
    session.league.season_complete = true;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SUNDAY,
      action: "advance",
      daysAdvanced: 1,
    });
  });

  it("steps daily toward Sunday on a non-match week", () => {
    const session = newGameSession();
    session.week = 35;
    session.weekday = 2;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: 3,
      action: "advance",
      daysAdvanced: 1,
    });
    session.weekday = SATURDAY;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SUNDAY,
      action: "advance",
      daysAdvanced: 1,
    });
  });

  it("simulates the week from Sunday", () => {
    const session = newGameSession();
    session.weekday = SUNDAY;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SUNDAY,
      action: "simulate_week",
      daysAdvanced: 0,
    });
  });
});
