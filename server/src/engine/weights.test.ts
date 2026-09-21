import { describe, expect, it } from "vitest";
import { openPlayWeights, shotOutcomeChances } from "./weights.ts";

describe("openPlayWeights", () => {
  it("raises duel weight when the defender is close and pressing is high", () => {
    const loose = openPlayWeights({
      distanceToDefender: 22,
      distanceToGoal: 50,
      pressing: 30,
      tempo: 50,
      mentality: 50,
      passing: 70,
      dribbling: 60,
      pace: 60,
      shooting: 60,
      form: 60,
      fatigue: 10,
      strikerBonus: false,
    });
    const pressed = openPlayWeights({
      distanceToDefender: 4,
      distanceToGoal: 50,
      pressing: 85,
      tempo: 50,
      mentality: 50,
      passing: 70,
      dribbling: 60,
      pace: 60,
      shooting: 60,
      form: 60,
      fatigue: 10,
      strikerBonus: false,
    });
    expect(pressed.duel).toBeGreaterThan(loose.duel);
    expect(loose.duel).toBe(0);
  });

  it("favours carry when mentality, dribbling, and pace are high", () => {
    const cautious = openPlayWeights({
      distanceToDefender: 18,
      distanceToGoal: 50,
      pressing: 40,
      tempo: 40,
      mentality: 30,
      passing: 80,
      dribbling: 40,
      pace: 40,
      shooting: 40,
      form: 50,
      fatigue: 10,
      strikerBonus: false,
    });
    const direct = openPlayWeights({
      distanceToDefender: 18,
      distanceToGoal: 50,
      pressing: 40,
      tempo: 70,
      mentality: 80,
      passing: 50,
      dribbling: 80,
      pace: 85,
      shooting: 50,
      form: 70,
      fatigue: 5,
      strikerBonus: false,
    });
    expect(direct.carry / direct.pass).toBeGreaterThan(
      cautious.carry / cautious.pass,
    );
  });

  it("raises shot weight near goal for a striker", () => {
    const midfield = openPlayWeights({
      distanceToDefender: 18,
      distanceToGoal: 48,
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 60,
      dribbling: 60,
      pace: 60,
      shooting: 80,
      form: 70,
      fatigue: 5,
      strikerBonus: true,
    });
    const box = openPlayWeights({
      distanceToDefender: 18,
      distanceToGoal: 10,
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 60,
      dribbling: 60,
      pace: 60,
      shooting: 80,
      form: 70,
      fatigue: 5,
      strikerBonus: true,
    });
    expect(box.shot).toBeGreaterThan(midfield.shot);
    expect(midfield.shot).toBe(0);
    expect(box.shot).toBeGreaterThan(box.pass);
  });

  it("carries through the D instead of shooting from 18 metres", () => {
    const shared = {
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 60,
      dribbling: 70,
      pace: 70,
      shooting: 80,
      form: 70,
      fatigue: 5,
      strikerBonus: true,
    };
    const fringe = openPlayWeights({
      ...shared,
      distanceToDefender: 8,
      distanceToGoal: 18,
    });
    const box = openPlayWeights({
      ...shared,
      distanceToDefender: 8,
      distanceToGoal: 10,
    });
    expect(fringe.carry).toBeGreaterThan(fringe.shot);
    expect(box.shot).toBeGreaterThan(box.carry);
  });

  it("shoots instead of dropping deep when no useful outlet is on", () => {
    const shared = {
      distanceToDefender: 10,
      distanceToGoal: 14,
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 70,
      dribbling: 60,
      pace: 60,
      shooting: 72,
      form: 65,
      fatigue: 8,
      strikerBonus: true,
    };
    const withOptions = openPlayWeights({ ...shared, usefulOutlets: 3 });
    const stuck = openPlayWeights({ ...shared, usefulOutlets: 0 });
    expect(stuck.shot).toBeGreaterThan(stuck.pass);
    expect(stuck.shot / stuck.pass).toBeGreaterThan(
      withOptions.shot / withOptions.pass,
    );
  });

  it("raises shot weight in the gained-ball window", () => {
    const base = {
      distanceToDefender: 16,
      distanceToGoal: 18,
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 60,
      dribbling: 60,
      pace: 60,
      shooting: 70,
      form: 60,
      fatigue: 10,
      strikerBonus: true,
    };
    const settled = openPlayWeights(base);
    const transition = openPlayWeights({ ...base, transitionAttack: true });
    expect(transition.shot).toBeGreaterThan(settled.shot);
    expect(transition.carry).toBeGreaterThan(settled.carry);
  });

  it("prefers a pass to a carry in space for a typical midfielder", () => {
    const mid = openPlayWeights({
      distanceToDefender: 18,
      distanceToGoal: 50,
      pressing: 44,
      tempo: 52,
      mentality: 52,
      passing: 70,
      dribbling: 60,
      pace: 60,
      shooting: 55,
      form: 55,
      fatigue: 12,
      strikerBonus: false,
    });
    expect(mid.pass).toBeGreaterThan(mid.carry);
  });

  it("makes a save the usual finish for an on-target open-play shot", () => {
    const box = shotOutcomeChances({
      shooting: 78,
      form: 60,
      fatigue: 10,
      mentality: 55,
      distanceToGoal: 14,
      keeperGoalkeeping: 72,
      keeperPositioning: 68,
      keeperForm: 55,
      keeperFatigue: 8,
      defenderClose: true,
      defenderTackling: 70,
      restCovers: 3,
    });
    expect(box.goalGivenOnTarget).toBeLessThan(0.38);
    expect(box.onTarget * (1 - box.block) * box.goalGivenOnTarget).toBeLessThan(
      0.14,
    );
  });
});
