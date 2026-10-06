import { describe, expect, it } from "vitest";
import { emptyWeeklyTrainingPlan } from "./training-plan-state.ts";
import { defaultTrainingPlan } from "./training-units.ts";
import { isTrainingPlanNeglected } from "./training-neglect.ts";

describe("training neglect", () => {
  it("treats zero focus slots as neglected", () => {
    expect(isTrainingPlanNeglected(emptyWeeklyTrainingPlan())).toBe(true);
    expect(isTrainingPlanNeglected(defaultTrainingPlan())).toBe(false);
  });
});
