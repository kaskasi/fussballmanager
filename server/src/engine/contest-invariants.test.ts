import { describe, expect, it } from "vitest";
import { asPlayerId, asTeamId } from "@fussballmanager/shared";
import type { PlayerMatchStatus } from "@fussballmanager/shared";
import { interceptChance } from "./lanes.ts";
import { carryLengthMax } from "./carry.ts";
import { offBallMaxStep } from "./shape.ts";
import {
  aerialContestAttribute,
  contestStrength,
  contestWinChance,
  openPlayWeights,
  passCompleteChance,
  shotOutcomeChances,
} from "./weights.ts";

const fresh = { form: 60, fatigue: 10, tacticBonus: 0 };

function aerialStrength(aerial: number, heightCm: number): number {
  return contestStrength({
    ...fresh,
    attribute: aerialContestAttribute({ aerial, heightCm }),
  });
}

function groundStrength(attribute: number): number {
  return contestStrength({ ...fresh, attribute });
}

/**
 * Guardrails against FM-style cheese: one physical (pace, or height)
 * must not flatten every other contest.
 */
describe("physicals do not flatten skill contests", () => {
  it("lets a 2m side win headers against A-Jugend height when aerial skill is equal", () => {
    const giants = aerialStrength(50, 200);
    const youth = aerialStrength(50, 165);
    expect(contestWinChance(giants, youth)).toBeGreaterThan(0.58);
    expect(contestWinChance(youth, giants)).toBeLessThan(0.42);
  });

  it("still lets a short, skilled header beat a tall, clumsy one", () => {
    const giant = aerialStrength(28, 200);
    const youth = aerialStrength(88, 165);
    expect(contestWinChance(youth, giant)).toBeGreaterThan(0.55);
  });

  it("does not let maxed pace win a shooting contest against a finisher", () => {
    const shotBase = {
      form: 60,
      fatigue: 10,
      mentality: 50,
      distanceToGoal: 14,
      keeperGoalkeeping: 70,
      keeperPositioning: 60,
      keeperForm: 55,
      keeperFatigue: 5,
      defenderClose: false,
      defenderTackling: 50,
    };
    const sprinter = shotOutcomeChances({ ...shotBase, shooting: 20 });
    const finisher = shotOutcomeChances({ ...shotBase, shooting: 82 });
    expect(finisher.onTarget).toBeGreaterThan(sprinter.onTarget);
    expect(finisher.goalGivenOnTarget).toBeGreaterThan(sprinter.goalGivenOnTarget);
  });

  it("does not let maxed pace complete more passes than passing skill", () => {
    const sprinter = passCompleteChance({
      passing: 20,
      form: 60,
      fatigue: 10,
      pressing: 40,
    });
    const passer = passCompleteChance({
      passing: 82,
      form: 60,
      fatigue: 10,
      pressing: 40,
    });
    expect(passer).toBeGreaterThan(sprinter);
  });

  it("resolves tackles and dribbles on tackling/dribbling, not pace", () => {
    const paceMerchant = groundStrength(22);
    const tackler = groundStrength(84);
    const dribbler = groundStrength(84);
    expect(contestWinChance(tackler, paceMerchant)).toBeGreaterThan(0.65);
    expect(contestWinChance(dribbler, paceMerchant)).toBeGreaterThan(0.65);
  });

  it("does not let maxed pace win a header against equal aerial skill", () => {
    const sameHeight = aerialStrength(55, 180);
    expect(contestWinChance(sameHeight, sameHeight)).toBeCloseTo(0.5, 5);
  });

  it("needs dribbling to carry, not only pace", () => {
    const nearGoal = {
      distanceToDefender: 16,
      distanceToGoal: 12,
      pressing: 40,
      tempo: 50,
      mentality: 55,
      passing: 40,
      form: 60,
      fatigue: 10,
      strikerBonus: false,
    };
    const sprinter = openPlayWeights({
      ...nearGoal,
      dribbling: 22,
      pace: 99,
      shooting: 20,
    });
    const dribbler = openPlayWeights({
      ...nearGoal,
      dribbling: 82,
      pace: 22,
      shooting: 20,
    });
    const finisher = openPlayWeights({
      ...nearGoal,
      dribbling: 40,
      pace: 22,
      shooting: 82,
    });
    expect(dribbler.carry).toBeGreaterThan(sprinter.carry);
    expect(finisher.shot).toBeGreaterThan(sprinter.shot);
  });

  it("caps pace so a sprinter is not first to every ball", () => {
    expect(offBallMaxStep(99) / offBallMaxStep(20)).toBeLessThan(1.35);
    expect(carryLengthMax(22, 99) / carryLengthMax(82, 22)).toBeLessThan(1.15);
  });

  it("lets positioning intercept more than raw pace", () => {
    const reader = interceptChance(coverer({ positioning: 82, pace: 22 }), 40, false);
    const sprinter = interceptChance(coverer({ positioning: 22, pace: 99 }), 40, false);
    expect(reader).toBeGreaterThan(sprinter);
  });
});

function coverer(input: { positioning: number; pace: number }): PlayerMatchStatus {
  return {
    playerId: asPlayerId("cover"),
    teamId: asTeamId("away"),
    role: "CM",
    position: { x: 50, y: 50 },
    onPitch: true,
    attributes: {
      passing: 50,
      tackling: 50,
      shooting: 50,
      pace: input.pace,
      stamina: 50,
      positioning: input.positioning,
      aerial: 50,
      dribbling: 50,
      goalkeeping: 8,
      heightCm: 180,
    },
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}
