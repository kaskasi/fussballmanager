import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { hubBlockerCount, listHubBlockers } from "./hub-blockers.ts";
import { buildHubTrainingWindow } from "./hub-training-window.ts";
import { MONDAY, SATURDAY, THURSDAY, FRIDAY } from "../sim/day-calendar.ts";
import { isLeagueMatchWeek } from "../sim/game-calendar.ts";

describe("hub blockers", () => {
  it("lists no blockers on a fresh game Monday after calendar gate", () => {
    const session = newGameSession();
    session.weekday = MONDAY;
    session.trainingCalendarGateDone = true;
    const blockers = listHubBlockers({
      session,
      youthInbox: session.youthInbox,
      players: session.players,
    });
    expect(blockers.some((b) => b.kind === "inbox")).toBe(false);
  });
});

describe("hub training window", () => {
  it("returns three day columns", () => {
    const session = newGameSession();
    session.weekday = 3;
    const columns = buildHubTrainingWindow(session, session.trainingPlan);
    expect(columns).toHaveLength(3);
    expect(columns.map((c) => c.offset)).toEqual([-1, 0, 1]);
    expect(columns[1]!.weekday).toBe(3);
  });

  it("uses Sunday for day before Monday (no duplicate Monday labels)", () => {
    const session = newGameSession();
    session.weekday = MONDAY;
    const columns = buildHubTrainingWindow(session, session.trainingPlan);
    expect(columns.map((c) => c.weekday)).toEqual([7, 1, 2]);
    expect(columns.map((c) => c.weekdayLabel)).toEqual(["So", "Mo", "Di"]);
  });

  it("shows match preview on Saturday only, not on Friday eve", () => {
    const session = newGameSession();
    const matchWeek = [session.week, session.week + 1, session.week + 2].find((week) =>
      isLeagueMatchWeek(week),
    );
    if (matchWeek == null) return;
    session.week = matchWeek;
    session.matchPlayedThisWeek = false;

    session.weekday = THURSDAY;
    const thuColumns = buildHubTrainingWindow(session, session.trainingPlan);
    const thuTomorrow = thuColumns.find((column) => column.offset === 1);
    expect(thuTomorrow?.weekday).toBe(FRIDAY);
    expect(thuTomorrow?.isMatchPreview).toBe(false);

    session.weekday = FRIDAY;
    const friColumns = buildHubTrainingWindow(session, session.trainingPlan);
    const friTomorrow = friColumns.find((column) => column.offset === 1);
    expect(friTomorrow?.weekday).toBe(SATURDAY);
    expect(friTomorrow?.isMatchPreview).toBe(true);
    expect(friTomorrow?.opponentShortName).toBeTruthy();
  });

  it("exposes opponent on match Saturday when it is today", () => {
    const session = newGameSession();
    const matchWeek = [session.week, session.week + 1, session.week + 2].find((week) =>
      isLeagueMatchWeek(week),
    );
    if (matchWeek == null) return;
    session.week = matchWeek;
    session.weekday = SATURDAY;
    session.matchPlayedThisWeek = false;
    const columns = buildHubTrainingWindow(session, session.trainingPlan);
    const today = columns.find((column) => column.offset === 0);
    expect(today?.isMatchPreview).toBe(true);
    expect(today?.opponentShortName).toBeTruthy();
  });
});

describe("hubBlockerCount", () => {
  it("returns a number", () => {
    const session = newGameSession();
    expect(hubBlockerCount({ session, youthInbox: session.youthInbox, players: session.players })).toBeGreaterThanOrEqual(0);
  });
});
