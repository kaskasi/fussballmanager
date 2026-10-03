import { describe, expect, it } from "vitest";
import {
  defaultTrainingPlan,
  migrateLegacyTrainingPlan,
  planToSessions,
  trainingUnit,
  trainingUnitUnlocked,
  unitsForGroup,
} from "./training-units.ts";
import { SLOT_COUNT, validateWeeklyPlan } from "./weekly-plan.ts";

describe("training units", () => {
  it("migrates a legacy fifteen-slot week to five weekday slots", () => {
    const legacy = [
      { unitId: "tech_pass", focus: true },
      { unitId: "phys_speed", focus: false },
      { unitId: "ment_tactical", focus: false },
      { unitId: "tech_ball", focus: true },
      { unitId: "phys_power", focus: false },
      { unitId: "ment_calm", focus: false },
      { unitId: "tech_shoot", focus: false },
      { unitId: "phys_speed", focus: true },
      { unitId: "ment_leader", focus: false },
      { unitId: "tech_pass", focus: false },
      { unitId: "phys_power", focus: false },
      { unitId: "ment_tactical", focus: false },
      { unitId: "tech_ball", focus: false },
      { unitId: "phys_speed", focus: false },
      { unitId: "ment_calm", focus: false },
    ];
    const migrated = migrateLegacyTrainingPlan(legacy);
    expect(migrated).toHaveLength(SLOT_COUNT);
    expect(migrated[0]?.unitId).toBe("tech_pass");
    expect(migrated[4]?.unitId).toBe("tech_ball");
  });

  it("maps a named plan to PRD session groups", () => {
    const plan = defaultTrainingPlan();
    const sessions = planToSessions(plan);
    expect(sessions).toHaveLength(SLOT_COUNT);
    expect(validateWeeklyPlan(sessions).valid).toBe(true);
    expect(trainingUnit(plan[0]!.unitId).group).toBe("technical");
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
