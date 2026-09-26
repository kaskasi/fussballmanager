import { describe, expect, it } from "vitest";
import { defaultTrainingPlan, planToSessions, trainingUnit } from "./training-units.ts";
import { SLOT_COUNT, validateWeeklyPlan } from "./weekly-plan.ts";

describe("training units", () => {
  it("maps a named plan to PRD session groups", () => {
    const plan = defaultTrainingPlan();
    const sessions = planToSessions(plan);
    expect(sessions).toHaveLength(SLOT_COUNT);
    expect(validateWeeklyPlan(sessions).valid).toBe(true);
    expect(trainingUnit(plan[0]!.unitId).group).toBe("technical");
  });
});
