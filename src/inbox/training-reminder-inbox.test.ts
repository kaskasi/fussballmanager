import { describe, expect, it } from "vitest";
import { emptyWeeklyTrainingPlan } from "../development/training-plan-state.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { emptyInbox } from "../youth/decision-inbox.ts";
import {
  injectTrainingReminderInbox,
  shouldInjectTrainingReminderBeforeAdvance,
  trainingReminderConsumedForWeek,
} from "./training-reminder-inbox.ts";

describe("training reminder inbox", () => {
  it("injects only when delegation training is on and today slot has no focus", () => {
    const session = newGameSession();
    session.weekday = 3;
    session.assistantDelegation = { lineup: false, training: true, scouting: false };
    expect(
      shouldInjectTrainingReminderBeforeAdvance({
        delegation: session.assistantDelegation,
        trainingPlan: emptyWeeklyTrainingPlan(),
        youthInbox: session.youthInbox,
        session,
      }),
    ).toBe(true);
  });

  it("consumes reminder for the rest of the game week", () => {
    const session = newGameSession();
    session.trainingReminderWeek = { season: session.season, week: session.week };
    expect(trainingReminderConsumedForWeek(session)).toBe(true);
    session.weekday = 4;
    expect(
      shouldInjectTrainingReminderBeforeAdvance({
        delegation: { lineup: false, training: true, scouting: false },
        trainingPlan: emptyWeeklyTrainingPlan(),
        youthInbox: emptyInbox(session.week),
        session,
      }),
    ).toBe(false);
  });

  it("adds one inbox item per week id", () => {
    const inbox = emptyInbox(1);
    const next = injectTrainingReminderInbox(inbox, 1, 2);
    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.id).toBe("training-reminder-1-2");
    expect(injectTrainingReminderInbox(next, 1, 2).items).toHaveLength(1);
  });
});
