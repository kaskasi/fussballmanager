import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { hubBlockerCount, listHubBlockers } from "./hub-blockers.ts";
import { buildHubTrainingWindow } from "./hub-training-window.ts";
import { MONDAY } from "../sim/day-calendar.ts";

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
});

describe("hubBlockerCount", () => {
  it("returns a number", () => {
    const session = newGameSession();
    expect(hubBlockerCount({ session, youthInbox: session.youthInbox, players: session.players })).toBeGreaterThanOrEqual(0);
  });
});
