import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { MONDAY, resolveSmartSkip, SATURDAY } from "../sim/day-calendar.ts";
import {
  hasInboxBlockerForNext,
  shouldNavigateToCalendarBeforeTimeStep,
  shouldOpenLineupFromCalendar,
} from "./nav-next-flow.ts";

describe("nav-next-flow", () => {
  it("blocks NEXT to calendar on Monday with pending youth inbox", () => {
    const session = newGameSession();
    session.weekday = MONDAY;
    const youthInbox = session.youthInbox;
    expect(hasInboxBlockerForNext(session, youthInbox, session.players)).toBe(false);
  });

  it("opens lineup when skip is match or advance to Saturday in match week", () => {
    const session = newGameSession();
    session.week = 3;
    session.weekday = SATURDAY;
    session.matchPlayedThisWeek = false;
    const matchSkip = resolveSmartSkip(session, false);
    expect(matchSkip.action).toBe("match");
    expect(shouldOpenLineupFromCalendar(matchSkip, session)).toBe(true);

    session.weekday = 5;
    const advanceSa = resolveSmartSkip(session, false);
    expect(advanceSa.action).toBe("advance");
    expect(advanceSa.weekday).toBe(SATURDAY);
    expect(shouldOpenLineupFromCalendar(advanceSa, session)).toBe(true);
  });

  it("does not open lineup on advance to non-match Saturday", () => {
    const session = newGameSession();
    session.week = 35;
    session.weekday = 5;
    const skip = resolveSmartSkip(session, false);
    expect(skip.weekday).toBe(SATURDAY);
    expect(shouldOpenLineupFromCalendar(skip, session)).toBe(false);
  });

  it("requires calendar navigation when not on calendar and inbox clear", () => {
    expect(shouldNavigateToCalendarBeforeTimeStep("hub", false)).toBe(true);
    expect(shouldNavigateToCalendarBeforeTimeStep("calendar", false)).toBe(false);
    expect(shouldNavigateToCalendarBeforeTimeStep("hub", true)).toBe(false);
  });
});
