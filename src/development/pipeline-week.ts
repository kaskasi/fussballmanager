import type { Attributes, Player } from "../types/player.ts";
import { applyGrowth, calculateWeeklyGrowth } from "./growth-engine.ts";
import { defaultTrainingPlan, planToSessions } from "./training-units.ts";
import { focusSlotsFor, type TrainingSession } from "./weekly-plan.ts";

/**
 * One development week for the pipeline dashboard.
 * Noise is 1 so the heatmap repeats. Match minutes stay whatever the
 * player already has; this does not play a fixture.
 */

/** Default demo plan — same as `defaultTrainingPlan()` in the training UI. */
export const HUB_PLAN: readonly TrainingSession[] = planToSessions(defaultTrainingPlan());

const SKILLS = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "weak_foot",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

export function projectWeek(player: Player, sessions: readonly TrainingSession[]): number {
  return SKILLS.reduce((sum, key) => sum + growthOf(player, key, sessions), 0);
}

export function applyTrainingWeek(player: Player, sessions: readonly TrainingSession[]): Player {
  const attributes = { ...player.attributes };
  for (const key of SKILLS) {
    attributes[key] = applyGrowth(player.attributes[key], growthOf(player, key, sessions));
  }
  return { ...player, attributes };
}

function growthOf(player: Player, key: keyof Attributes, sessions: readonly TrainingSession[]): number {
  return calculateWeeklyGrowth({
    age: player.age,
    maturityOffset: player.hidden.maturity_offset,
    attribute: key,
    value: player.attributes[key],
    anlage: player.hidden.anlage[key],
    drive: player.hidden.drive,
    minutes: player.state.weekly_minutes,
    injured: player.state.injury !== null,
    focusSlots: focusSlotsFor(sessions, key),
    noise: 1,
  });
}
