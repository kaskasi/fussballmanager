import { clamp } from "./helpers.ts";
import { isolationFactor } from "./pressure.ts";

export type OpenPlayWeights = {
  pass: number;
  carry: number;
  duel: number;
  shot: number;
};

/** Explicit open-play weights: tactics + attributes + form + fatigue. */
export function openPlayWeights(input: {
  distanceToDefender: number;
  distanceToGoal: number;
  pressing: number;
  tempo: number;
  mentality: number;
  passing: number;
  dribbling: number;
  pace: number;
  shooting: number;
  form: number;
  fatigue: number;
  strikerBonus: boolean;
  /** Gained-ball window: more direct, more shots. */
  transitionAttack?: boolean;
  /** Teammates of the defending side still between ball and their goal. */
  restCovers?: number;
  localPress?: number;
}): OpenPlayWeights {
  const proximity = clamp((16 - input.distanceToDefender) / 16, 0, 1);
  const freshness = clamp((input.form - input.fatigue) / 100, -0.25, 0.45);
  const goalThreat = clamp((34 - input.distanceToGoal) / 34, 0, 1);
  const duel =
    proximity * (0.3 + 0.7 * (input.pressing / 100));
  const carry =
    (0.12 +
      0.42 * (input.dribbling / 100) +
      0.1 * (input.pace / 100) +
      0.2 * (input.mentality / 100) +
      0.15 * (input.tempo / 100) +
      freshness) *
    (1 - proximity * 0.35);
  const pass =
    (0.18 +
      0.5 * (input.passing / 100) +
      0.2 * (input.tempo / 100) +
      freshness) *
    (1 - proximity * 0.15);
  const shot =
    goalThreat *
    (0.2 +
      0.7 * (input.shooting / 100) +
      0.25 * (input.mentality / 100) +
      (input.strikerBonus ? 0.35 : 0) +
      freshness) *
    (input.transitionAttack ? 1.9 : 1) *
    isolationFactor(input.restCovers ?? 4);
  const swarm = Math.min(input.localPress ?? 1, 6) / 4;
  const carryBoost = input.transitionAttack ? 1.35 : 1;
  const passDamp = input.transitionAttack ? 0.82 : 1;
  return {
    pass: Math.max(pass * passDamp, 0.05),
    carry: Math.max(carry * carryBoost, 0.04),
    duel: duel * (0.55 + 0.7 * swarm),
    shot,
  };
}

export function passCompleteChance(input: {
  passing: number;
  form: number;
  fatigue: number;
  pressing: number;
}): number {
  const quality = (input.passing + input.form - input.fatigue) / 100;
  return clamp(0.5 + 0.4 * quality - 0.25 * (input.pressing / 100), 0.2, 0.92);
}

export function contestStrength(input: {
  attribute: number;
  form: number;
  fatigue: number;
  tacticBonus: number;
}): number {
  return Math.max(
    1,
    input.attribute + input.form * 0.5 - input.fatigue * 0.5 + input.tacticBonus,
  );
}

/** Average adult reference. Taller than this helps headers; shorter hurts. */
const AERIAL_HEIGHT_REF_CM = 180;

/** Height is centimetres, not a 0–100 skill. ~0.75 contest points per cm. */
export function heightAerialBonus(heightCm: number): number {
  return (clamp(heightCm, 150, 215) - AERIAL_HEIGHT_REF_CM) * 0.75;
}

/** Aerial skill plus standing height. Pace is not an input. */
export function aerialContestAttribute(input: {
  aerial: number;
  heightCm: number;
}): number {
  return input.aerial + heightAerialBonus(input.heightCm);
}

export function contestWinChance(self: number, opponent: number): number {
  return self / (self + opponent);
}

export function shotOutcomeChances(input: {
  shooting: number;
  form: number;
  fatigue: number;
  mentality: number;
  distanceToGoal: number;
  keeperGoalkeeping: number;
  keeperPositioning: number;
  keeperForm: number;
  keeperFatigue: number;
  defenderClose: boolean;
  defenderTackling: number;
  /** Lost-ball rest defence is not set; shots are more likely to go in. */
  transitionAttack?: boolean;
  restCovers?: number;
  /** Penalty: no wall, keeper 1v1 from 12 yards. */
  penalty?: boolean;
}): { onTarget: number; block: number; goalGivenOnTarget: number } {
  const quality = (input.shooting + input.form - input.fatigue) / 100;
  const onTarget = input.penalty
    ? clamp(0.72 + 0.2 * quality, 0.62, 0.94)
    : clamp(
        0.32 + 0.48 * quality - 0.015 * input.distanceToGoal + 0.12 * (input.mentality / 100),
        0.12,
        0.88,
      );
  const isolated = isolationFactor(input.restCovers ?? 4);
  const block =
    input.penalty || !input.defenderClose
      ? 0
      : clamp(
          (0.15 + 0.35 * (input.defenderTackling / 100)) *
            (input.transitionAttack ? 0.5 : 1) /
            isolated,
          0.04,
          0.55,
        );
  const shotStr = contestStrength({
    attribute: input.shooting,
    form: input.form,
    fatigue: input.fatigue,
    tacticBonus: input.mentality * 0.12,
  });
  const gkStr = contestStrength({
    attribute: input.keeperGoalkeeping,
    form: input.keeperForm,
    fatigue: input.keeperFatigue,
    tacticBonus: input.keeperPositioning * 0.15,
  });
  const goalGivenOnTarget =
    (shotStr / (shotStr + gkStr * (input.penalty ? 1.05 : 1.2))) *
    (input.transitionAttack ? 1.28 : 1) *
    (input.penalty ? 1.15 : isolated);
  return { onTarget, block, goalGivenOnTarget };
}
