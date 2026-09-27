import { describe, expect, it } from "vitest";
import {
  coachEnvironmentFactor,
  coachWeeklyWage,
  defaultCoachingStaff,
  environmentFromCoachingStaff,
  hireCoach,
  weeklyStaffWageBill,
} from "./coaching-staff.ts";

describe("coaching-staff", () => {
  it("maps coach quality to environment factor", () => {
    expect(coachEnvironmentFactor(50)).toBeCloseTo(1.0, 2);
    expect(coachEnvironmentFactor(80)).toBeCloseTo(1.06, 2);
    expect(coachEnvironmentFactor(35)).toBeLessThan(coachEnvironmentFactor(90));
  });

  it("averages environment across attack, defense and fitness", () => {
    const staff = defaultCoachingStaff(1);
    const factor = environmentFromCoachingStaff(staff);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(1.12);
  });

  it("charges coach wages plus overhead", () => {
    const staff = defaultCoachingStaff(1);
    const bill = weeklyStaffWageBill(staff);
    expect(bill).toBeGreaterThan(weeklyStaffWageBill({ attack: null, defense: null, fitness: null }));
    expect(coachWeeklyWage(70)).toBe(8_450);
  });

  it("replaces coach on hire", () => {
    const staff = defaultCoachingStaff(1);
    const candidate = {
      id: "coach_attack_new",
      name: "Test Coach",
      role: "attack" as const,
      quality: 82,
      wage_weekly: coachWeeklyWage(82),
      contract_until_season: 3,
    };
    const next = hireCoach(staff, candidate);
    expect(next.attack?.name).toBe("Test Coach");
    expect(next.defense).toEqual(staff.defense);
  });
});
