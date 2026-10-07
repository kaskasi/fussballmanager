import { describe, expect, it } from "vitest";
import { weeklyFocusCount } from "../development/training-plan-state.ts";
import { defaultTrainingPlan } from "../development/training-units.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { appendBreakoutNarrativesToEvents, simulateGameWeek } from "./week-pipeline.ts";

describe("week pipeline breakout narratives", () => {
  it("publishes visible player arcs to the club feed", () => {
    const events = appendBreakoutNarrativesToEvents(
      [],
      [{
        playerId: "pl_00042",
        eventId: "late_bloomer_kick",
        narrative: "Max wirkt wie ausgewechselt.",
        week: 12,
      }],
      2,
      12,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      season: 2,
      week: 12,
      kind: "profile",
      message: "Max wirkt wie ausgewechselt.",
    });
  });
});

describe("simulateGameWeek training plan", () => {
  it("clears weekly focus after the week sim (F2.1); assistant does not refill", async () => {
    const session = newGameSession();
    const plan = defaultTrainingPlan();
    expect(weeklyFocusCount(plan)).toBeGreaterThan(0);

    const result = await simulateGameWeek({
      ...session,
      trainingPlan: plan,
      weekday: 7,
      assistantDelegation: { lineup: false, training: true, scouting: true },
    });

    expect(weeklyFocusCount(result.session.trainingPlan)).toBe(0);
    expect(result.session.trainingPlan).toHaveLength(15);
    expect(result.session.trainingPlan.every((slot) => slot.unitId === "")).toBe(true);
    expect(result.session.week).toBe(session.week + 1);
  });
});
