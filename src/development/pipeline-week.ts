import type { Attributes, Player } from "../types/player.ts";
import { isOnProTrial } from "../youth/pro-trial.ts";
import { applyGrowth, calculateWeeklyGrowth } from "./growth-engine.ts";
import { trainingIntensityMultiplier } from "./training-load.ts";
import { defaultTrainingPlan, planToSessions } from "./training-units.ts";
import { focusSlotsFor, type TrainingSession } from "./weekly-plan.ts";

export interface TrainingWeekContext {
  season: number;
  week: number;
  intensity?: number;
  /** F8.1 — from coaching staff; default 1.0. */
  environmentFactor?: number;
}

/**
 * One development week for training projection and simulation.
 * Match minutes stay whatever the player already has; this does not play a fixture.
 */

/** Default demo plan — same as `defaultTrainingPlan()` in the training UI. */
export const HUB_PLAN: readonly TrainingSession[] = planToSessions(defaultTrainingPlan());

/** Youth teams train and play at lower intensity than the pro squad. */
export function developmentScale(status: Player["squad_status"]): number {
  switch (status) {
    case "u17":
      return 0.3;
    case "u19":
      return 0.55;
    default:
      return 1;
  }
}

export function effectiveDevelopmentScale(
  player: Player,
  context?: TrainingWeekContext,
): number {
  if (context && isOnProTrial(player, context.season, context.week)) {
    return 1;
  }
  return developmentScale(player.squad_status);
}

/** Youth minutes count less toward match-practice growth than pro minutes. */
export function developmentMinutes(status: Player["squad_status"], minutes: number): number {
  switch (status) {
    case "u17":
      return Math.min(minutes, 45);
    case "u19":
      return Math.min(minutes, 70);
    default:
      return minutes;
  }
}

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

export function applyTrainingWeek(
  player: Player,
  sessions: readonly TrainingSession[],
  context?: TrainingWeekContext,
  random?: () => number,
): Player {
  const attributes = { ...player.attributes };
  for (const key of SKILLS) {
    attributes[key] = applyGrowth(
      player.attributes[key],
      growthOf(player, key, sessions, context, random),
    );
  }
  return { ...player, attributes };
}

function growthOf(
  player: Player,
  key: keyof Attributes,
  sessions: readonly TrainingSession[],
  context?: TrainingWeekContext,
  random?: () => number,
): number {
  const scale =
    effectiveDevelopmentScale(player, context) *
    trainingIntensityMultiplier(context?.intensity ?? 100);
  const raw = calculateWeeklyGrowth({
    age: player.age,
    maturityOffset: player.hidden.maturity_offset,
    attribute: key,
    value: player.attributes[key],
    anlage: player.hidden.anlage[key],
    drive: player.hidden.drive,
    minutes: developmentMinutes(player.squad_status, player.state.weekly_minutes),
    injured: player.state.injury !== null,
    focusSlots: focusSlotsFor(sessions, key),
    environmentFactor: context?.environmentFactor ?? 1,
    noise: random ? undefined : 1,
    random,
  });
  return raw * scale;
}
