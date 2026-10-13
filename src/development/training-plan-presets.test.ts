import { describe, expect, it } from "vitest";
import { defaultTrainingPlan } from "./training-units.ts";
import {
  defaultTrainingPlanPresets,
  loadTrainingPlanPreset,
  saveTrainingPlanPreset,
  trainingPresetHasContent,
} from "./training-plan-presets.ts";
import { planToSessions } from "./training-units.ts";
import { validateWeeklyPlan } from "./weekly-plan.ts";

describe("training plan presets", () => {
  it("seeds preset 1 with a valid balanced starter plan", () => {
    const presets = defaultTrainingPlanPresets();
    const slot = presets[0]!;
    expect(slot.id).toBe(1);
    expect(trainingPresetHasContent(slot)).toBe(true);
    expect(validateWeeklyPlan(planToSessions(slot.plan)).valid).toBe(true);
  });

  it("saves and loads a weekly plan copy", () => {
    const plan = defaultTrainingPlan();
    const saved = saveTrainingPlanPreset([], 2, plan, "Pressing-Woche");
    expect(trainingPresetHasContent(saved[1]!)).toBe(true);
    const loaded = loadTrainingPlanPreset(saved, 2);
    expect(loaded[0]?.unitId).toBe(plan[0]?.unitId);
    expect(saved[1]?.label).toBe("Pressing-Woche");
    loaded[0] = { unitId: "", focus: false };
    expect(saved[1]?.plan[0]?.unitId).toBe(plan[0]?.unitId);
  });
});
