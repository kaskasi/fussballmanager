import { describe, expect, it } from "vitest";
import {
  defaultTrainingPlan,
  migrateLegacyTrainingPlan,
  planToSessions,
  trainingUnit,
  trainingUnitUnlocked,
  unitsForGroup,
} from "./training-units.ts";
import { emptyWeeklyTrainingPlan } from "./training-plan-state.ts";
import { SLOT_COUNT, validateWeeklyPlan } from "./weekly-plan.ts";

describe("training units", () => {
  it("keeps a full fifteen-slot week and expands legacy five-day weeks", () => {
    const legacyFive = [
      { unitId: "tech_pass", focus: true },
      { unitId: "phys_speed", focus: false },
      { unitId: "ment_tactical", focus: false },
      { unitId: "tech_ball", focus: true },
      { unitId: "phys_power", focus: false },
    ];
    const migrated = migrateLegacyTrainingPlan(legacyFive);
    expect(migrated).toHaveLength(SLOT_COUNT);
    expect(migrated[0]?.unitId).toBe("tech_pass");
    expect(migrated[1]?.unitId).toBe("");
    expect(migrated[9]?.unitId).toBe("tech_ball");
  });

  it("maps a named plan to PRD session groups", () => {
    const plan = defaultTrainingPlan();
    const sessions = planToSessions(plan);
    expect(sessions).toHaveLength(SLOT_COUNT);
    expect(validateWeeklyPlan(sessions).valid).toBe(true);
    expect(trainingUnit(plan[0]!.unitId).group).toBe("technical");
  });

  it("maps an empty week to valid non-focus sessions", () => {
    const plan = emptyWeeklyTrainingPlan();
    expect(plan.every((slot) => slot.unitId === "")).toBe(true);
    expect(validateWeeklyPlan(planToSessions(plan)).valid).toBe(true);
  });

  it("strips legacy Passspiel-only placeholder weeks on normalize", () => {
    const legacy = emptyWeeklyTrainingPlan().map((slot) => ({
      ...slot,
      unitId: "tech_pass",
    }));
    const normalized = migrateLegacyTrainingPlan(legacy);
    expect(normalized.every((slot) => slot.unitId === "")).toBe(true);
  });

  it("locks Hallentraining until the campus hall exists", () => {
    const hall = trainingUnit("phys_hall");
    expect(trainingUnitUnlocked(hall)).toBe(false);
    expect(trainingUnitUnlocked(hall, { hasTrainingHall: true })).toBe(true);
    expect(unitsForGroup("physical")).not.toContainEqual(expect.objectContaining({ id: "phys_hall" }));
    expect(unitsForGroup("physical", { hasTrainingHall: true }).some((unit) => unit.id === "phys_hall")).toBe(
      true,
    );
  });
});
