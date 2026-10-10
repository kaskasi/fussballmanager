import type { Attributes, Player } from "../types/player.ts";
import { isOnProTrial } from "../youth/pro-trial.ts";
import {
  applyGrowth,
  calculateWeeklyGrowth,
  calculateWeeklyTrainingGain,
  weeklyDecayDelta,
} from "./growth-engine.ts";
import { trainingIntensityMultiplier } from "./training-load.ts";
import { applyFitnessRecoveryFraction } from "./fitness-management.ts";
import {
  defaultTrainingPlan,
  isTrainingSlotEmpty,
  planToSessions,
  trainingUnit,
  type TrainingSlot,
  type TrainingUnit,
} from "./training-units.ts";
import {
  attributesIn,
  focusSlotsFor,
  SLOT_COUNT,
  type TrainingSession,
} from "./weekly-plan.ts";

export interface TrainingWeekContext {
  season: number;
  week: number;
  masterSeed?: number;
  intensity?: number;
  /** F8.1 — from coaching staff; default 1.0. */
  environmentFactor?: number;
  /** Completed league matchdays this season (pro playing-time gate). */
  leagueMatchdaysPlayed?: number;
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
      return 0.88;
    case "u19":
      return 0.94;
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
      return Math.min(minutes, 75);
    case "u19":
      return Math.min(minutes, 85);
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

/** Auto-training week sim — stacks Erholung / Massagen from the timetable. */
export function applyPlanFitnessRecovery(player: Player, plan: readonly TrainingSlot[]): Player {
  let next = player;
  for (const slot of plan) {
    if (isTrainingSlotEmpty(slot)) continue;
    const unit = trainingUnit(slot.unitId);
    if (unit.fitnessRecoveryFraction === undefined) continue;
    next = applyFitnessRecoveryFraction(next, unit.fitnessRecoveryFraction);
  }
  return next;
}

function resolveGrowthRandom(
  player: Player,
  key: keyof Attributes,
  context?: TrainingWeekContext,
  channel = "team",
  random?: () => number,
): (() => number) | undefined {
  if (random) return random;
  if (context?.masterSeed === undefined) return undefined;
  return seededGrowthRandom(
    context.masterSeed,
    context.season,
    context.week,
    player.id,
    key,
    channel,
  );
}

function trainingGainOf(
  player: Player,
  key: keyof Attributes,
  sessions: readonly TrainingSession[],
  context?: TrainingWeekContext,
  channel = "team",
  random?: () => number,
): number {
  const scale =
    effectiveDevelopmentScale(player, context) *
    trainingIntensityMultiplier(context?.intensity ?? 100);
  const resolvedRandom = resolveGrowthRandom(player, key, context, channel, random);
  let raw = calculateWeeklyTrainingGain({
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
    squadStatus: player.squad_status,
    seasonApps: player.state.season_apps,
    leagueMatchdaysPlayed: context?.leagueMatchdaysPlayed ?? 0,
    noise: resolvedRandom ? undefined : 1,
    random: resolvedRandom,
  });
  if (player.attributes[key] >= 180 && raw > 0) {
    raw *= 0.3;
  }
  return (raw * scale) / SLOT_COUNT;
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
  const resolvedRandom = resolveGrowthRandom(player, key, context, "team", random);
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
    squadStatus: player.squad_status,
    seasonApps: player.state.season_apps,
    leagueMatchdaysPlayed: context?.leagueMatchdaysPlayed ?? 0,
    noise: resolvedRandom ? undefined : 1,
    random: resolvedRandom,
  });
  return raw * scale;
}

const EMPTY_UNIT_SESSION: TrainingSession = { group: "mental", focus: false };

/** One real session in the week grid; other slots are inert for focus counting. */
export function isolatedUnitSessions(
  weekSessions: readonly TrainingSession[],
  slotIndex: number,
): TrainingSession[] {
  if (weekSessions.length !== SLOT_COUNT) {
    throw new Error(`expected ${SLOT_COUNT} sessions, received ${weekSessions.length}`);
  }
  return weekSessions.map((session, index) => (index === slotIndex ? session : EMPTY_UNIT_SESSION));
}

export function applyTrainingUnit(
  player: Player,
  weekSessions: readonly TrainingSession[],
  slotIndex: number,
  context?: TrainingWeekContext,
  unit?: TrainingUnit,
): Player {
  if (unit?.fitnessRecoveryFraction !== undefined) {
    return applyFitnessRecoveryFraction(player, unit.fitnessRecoveryFraction);
  }
  const channel = `team-unit-${slotIndex}`;
  const sessions = isolatedUnitSessions(weekSessions, slotIndex);
  const boost = unit?.growthBoost ?? 1;
  const targetKeys: (keyof Attributes)[] = unit
    ? [...unit.skills]
    : [...attributesIn(sessions[slotIndex]!.group)];
  const attributes = { ...player.attributes };
  for (const key of targetKeys) {
    let delta = trainingGainOf(player, key, sessions, context, channel);
    if (delta === 0) continue;
    if (unit) delta *= boost;
    attributes[key] = applyGrowth(player.attributes[key], delta);
  }
  return { ...player, attributes };
}

export function applyWeeklyAttributeDecay(player: Player): Player {
  const attributes = { ...player.attributes };
  for (const key of SKILLS) {
    const delta = weeklyDecayDelta(key, player.age, player.hidden.maturity_offset);
    if (delta === 0) continue;
    attributes[key] = applyGrowth(player.attributes[key], delta);
  }
  return { ...player, attributes };
}

export function seededGrowthRandom(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
  attribute: keyof Attributes,
  channel: string,
): () => number {
  let hash = 0x811c9dc5;
  for (const char of `${masterSeed}:${season}:${week}:${playerId}:${attribute}:${channel}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x9e3779b1);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
