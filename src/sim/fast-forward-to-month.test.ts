import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { civilDateEndOfMonth } from "./fast-forward-to-month.ts";
import {
  bypassTrainingNextForPlaytest,
  compareCivilDates,
  fastForwardTargetDate,
  fastForwardToMonthEnd,
  hasReachedFastForwardTarget,
} from "./fast-forward-to-month.ts";
import { civilDateFromSession } from "./session-civil-date.ts";
import { isTrainingNextActive } from "./training-next.ts";
import { emptyWeeklyTrainingPlan } from "../development/training-plan-state.ts";

describe("fastForwardToMonth", () => {
  it("targets end of the selected calendar month", () => {
    const session = newGameSession();
    const target = fastForwardTargetDate(session.season, session.week, session.weekday, 9);
    expect(target.monthIndex).toBe(9);
    expect(target.day).toBe(civilDateEndOfMonth(session.season, 9).day);
  });

  it("detects when session date reached target", () => {
    const session = newGameSession();
    const endOctober = civilDateEndOfMonth(session.season, 9);
    const civil = civilDateFromSession(session.season, session.week, session.weekday);
    expect(compareCivilDates(civil, endOctober)).toBeLessThan(0);
    expect(
      hasReachedFastForwardTarget(session.season, session.week, session.weekday, endOctober),
    ).toBe(false);
  });

  it("bypasses training-next when slots are empty (no infinite loop)", async () => {
    const session = {
      ...newGameSession(),
      trainingPlan: emptyWeeklyTrainingPlan(),
      trainingUnitsCompleted: 0,
      trainingCalendarGateDone: true,
    };
    expect(isTrainingNextActive(session)).toBe(true);
    const bypassed = bypassTrainingNextForPlaytest(session);
    expect(isTrainingNextActive(bypassed)).toBe(false);

    let steps = 0;
    const outcome = await fastForwardToMonthEnd(bypassed, 7, {
      simulateWeek: async (current) => ({ ...current, week: current.week + 1, weekday: 1 }),
      advanceSessionDays: (current, days, weekday) => ({
        ...current,
        weekday,
      }),
      onProgress: async () => {
        steps += 1;
      },
    });
    expect(outcome.reason).not.toBe("stall");
    expect(steps).toBeGreaterThan(0);
  }, 15_000);
});
