import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  applyFitnessRecoveryFraction,
  applyWeeklyFitness,
  fitnessRecoveryDelta,
  IDLE_WEEK_FITNESS_FRACTION,
  injuryRiskScore,
  isPlayerTired,
  RECOVERY_UNIT_FITNESS_FRACTION,
  weeklyFitnessDelta,
} from "./fitness-management.ts";
import { defaultCoachingStaff } from "../staff/coaching-staff.ts";

describe("fitness-management", () => {
  it("flags tired players from minutes and low fitness", () => {
    const player = clonePlayer();
    player.id = "p1";
    player.state.fitness = 60;
    expect(isPlayerTired(player)).toBe(true);

    player.state.fitness = 90;
    player.state.weekly_minutes = 85;
    expect(isPlayerTired(player)).toBe(true);
  });

  it("drains fitness on heavy minutes and recovers on light weeks", () => {
    const heavy = weeklyFitnessDelta(80, 90, 110, 1);
    const light = weeklyFitnessDelta(70, 20, 90, 1.1);
    expect(heavy).toBeLessThan(0);
    expect(light).toBeGreaterThan(0);
  });

  it("applies weekly fitness after match load", () => {
    const player = clonePlayer();
    player.id = "p1";
    player.state.fitness = 75;
    player.state.weekly_minutes = 88;
    const next = applyWeeklyFitness(player, {
      intensity: 115,
      coachingStaff: defaultCoachingStaff(2026),
    });
    expect(next.state.fitness).toBeLessThan(75);
  });

  it("recovers faster with a precinct regen bonus", () => {
    const player = clonePlayer();
    player.state.fitness = 70;
    player.state.weekly_minutes = 20;
    const plain = applyWeeklyFitness(player, {
      intensity: 90,
      coachingStaff: defaultCoachingStaff(2026),
    });
    const boosted = applyWeeklyFitness(player, {
      intensity: 90,
      coachingStaff: defaultCoachingStaff(2026),
      precinctRegen: 1.18,
    });
    expect(boosted.state.fitness).toBeGreaterThan(plain.state.fitness);
  });

  it("closes a fraction of the fitness gap for recovery units", () => {
    expect(fitnessRecoveryDelta(8, RECOVERY_UNIT_FITNESS_FRACTION)).toBe(18);
    expect(fitnessRecoveryDelta(100, RECOVERY_UNIT_FITNESS_FRACTION)).toBe(0);
    const player = clonePlayer();
    player.state.fitness = 8;
    const next = applyFitnessRecoveryFraction(player, RECOVERY_UNIT_FITNESS_FRACTION);
    expect(next.state.fitness).toBe(26);
  });

  it("adds idle-week recovery when a player had no match minutes", () => {
    const withMinutes = weeklyFitnessDelta(8, 45, 100, 1);
    const idle = weeklyFitnessDelta(8, 0, 100, 1);
    expect(idle).toBeGreaterThan(withMinutes);
    expect(fitnessRecoveryDelta(8, IDLE_WEEK_FITNESS_FRACTION)).toBe(23);
  });

  it("scores injury risk higher when tired and intense", () => {
    const rested = clonePlayer();
    rested.id = "rested";
    rested.state.fitness = 92;
    rested.state.weekly_minutes = 10;

    const loaded = clonePlayer();
    loaded.id = "loaded";
    loaded.state.fitness = 52;
    loaded.state.weekly_minutes = 90;
    loaded.state.recent_weekly_minutes = [88, 86];

    expect(injuryRiskScore(loaded, 125)).toBeGreaterThan(injuryRiskScore(rested, 100));
  });
});
