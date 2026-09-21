import { clamp } from "./helpers.ts";

export type OpenPlayWeights = {
  pass: number;
  carry: number;
  duel: number;
};

/** Explicit open-play weights: tactics + attributes + form + fatigue. */
export function openPlayWeights(input: {
  distanceToDefender: number;
  pressing: number;
  tempo: number;
  mentality: number;
  passing: number;
  dribbling: number;
  pace: number;
  form: number;
  fatigue: number;
}): OpenPlayWeights {
  const proximity = clamp((16 - input.distanceToDefender) / 16, 0, 1);
  const freshness = clamp((input.form - input.fatigue) / 100, -0.25, 0.45);
  const duel =
    proximity * (0.3 + 0.7 * (input.pressing / 100));
  const carry =
    (0.12 +
      0.45 * ((input.dribbling + input.pace) / 200) +
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
  return { pass: Math.max(pass, 0.05), carry: Math.max(carry, 0.04), duel };
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
