import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { MONDAY, resolveSmartSkip, SATURDAY, SUNDAY } from "./day-calendar.ts";

describe("day calendar smart skip", () => {
  it("stops on Monday when the inbox has pending decisions", () => {
    const session = newGameSession();
    session.weekday = MONDAY;
    expect(resolveSmartSkip(session, true)).toEqual({
      weekday: MONDAY,
      action: "inbox",
      daysAdvanced: 0,
    });
  });

  it("jumps to Saturday on a league match week", () => {
    const session = newGameSession();
    session.week = 3;
    session.weekday = MONDAY;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SATURDAY,
      action: "match",
      daysAdvanced: 5,
    });
  });

  it("jumps to Sunday on a non-match week", () => {
    const session = newGameSession();
    session.week = 35;
    session.weekday = 2;
    expect(resolveSmartSkip(session, false)).toEqual({
      weekday: SUNDAY,
      action: "simulate_week",
      daysAdvanced: 5,
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
