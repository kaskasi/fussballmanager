import { describe, expect, it } from "vitest";
import { injectKickerInbox } from "../inbox/kicker-inbox.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { MONDAY, resolveSmartSkip, SATURDAY } from "../sim/day-calendar.ts";
import { emptyInbox } from "../youth/decision-inbox.ts";
import {
  hasInboxBlockerForNext,
  pendingDecisionInboxItems,
  shouldNavigateToCalendarBeforeTimeStep,
  shouldOpenLineupFromCalendar,
} from "./nav-next-flow.ts";

describe("nav-next-flow", () => {
  it("does not treat Der Treter as a NEXT blocker", () => {
    const session = newGameSession();
    const inbox = injectKickerInbox(emptyInbox(session.week), session.season, session.week);
    expect(pendingDecisionInboxItems(inbox, session.players)).toHaveLength(0);
    expect(hasInboxBlockerForNext(session, inbox, session.players)).toBe(false);
  });

  it("has no inbox blocker when youth inbox is empty", () => {
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

  it("does not open lineup when the league season is complete", () => {
    const session = newGameSession();
    session.week = 16;
    session.weekday = SATURDAY;
    session.matchPlayedThisWeek = false;
    session.league.season_complete = true;
    const skip = resolveSmartSkip(session, false);
    expect(skip.action).toBe("advance");
    expect(shouldOpenLineupFromCalendar(skip, session)).toBe(false);
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
    expect(shouldNavigateToCalendarBeforeTimeStep("hub", false)).toBe(false);
    expect(shouldNavigateToCalendarBeforeTimeStep("calendar", false)).toBe(false);
    expect(shouldNavigateToCalendarBeforeTimeStep("hub", true)).toBe(false);
    expect(shouldNavigateToCalendarBeforeTimeStep("training", false)).toBe(true);
  });
});
