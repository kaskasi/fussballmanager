import type { Player } from "../types/player.ts";
import type { CoachingStaff } from "../staff/coaching-staff.ts";
import { coachEnvironmentFactor } from "../staff/coaching-staff.ts";
import { normalizeTrainingIntensity, trainingIntensityMultiplier } from "./training-load.ts";
import type { FatigueAmpel } from "./training-load.ts";

export interface WeeklyFitnessContext {
  intensity: number;
  coachingStaff: CoachingStaff;
  precinctRegen?: number;
  injuryRiskFactor?: number;
}

export interface InjuryRiskSummary {
  ampel: FatigueAmpel;
  icon: string;
  label: string;
  score: number;
}

/** PRD F1.4 — high load from minutes, fitness, or injury. */
export function isPlayerTired(player: Player): boolean {
  if (player.state.injury !== null) return true;
  if (player.state.fitness < 65) return true;
  if (player.state.weekly_minutes >= 80) return true;
  const recent = player.state.recent_weekly_minutes ?? [];
  const lastTwo = recent.slice(-2).reduce((sum, minutes) => sum + minutes, 0);
  return lastTwo >= 140;
}

export function clampFitness(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Share of the gap to full fitness (100) closed in one step — training or rest week. */
export const RECOVERY_UNIT_FITNESS_FRACTION = 0.2;
export const MASSAGE_UNIT_FITNESS_FRACTION = 0.33;
/** Match minutes = 0 this week — passive rest between fixtures. */
export const IDLE_WEEK_FITNESS_FRACTION = 0.25;

export function fitnessRecoveryDelta(fitness: number, fraction: number): number {
  if (fitness >= 100 || fraction <= 0) return 0;
  const gap = 100 - fitness;
  return clampFitness(fitness + gap * fraction) - fitness;
}

export function applyFitnessRecoveryFraction(player: Player, fraction: number): Player {
  if (player.state.injury !== null || fraction <= 0) return player;
  const delta = fitnessRecoveryDelta(player.state.fitness, fraction);
  if (delta === 0) return player;
  return {
    ...player,
    state: {
      ...player.state,
      fitness: clampFitness(player.state.fitness + delta),
    },
  };
}

export function modifierFitnessRegenMultiplier(player: Player): number {
  return player.state.modifiers.reduce(
    (product, modifier) => product * (modifier.fitness_regen_multiplier ?? 1),
    1,
  );
}

export function fitnessCoachRegenFactor(staff: CoachingStaff): number {
  const coach = staff.fitness;
  return coach ? coachEnvironmentFactor(coach.quality) : 1;
}

/** Net fitness change after a simulated week (match minutes + training load). */
export function weeklyFitnessDelta(
  fitness: number,
  weeklyMinutes: number,
  intensity: number,
  regenFactor: number,
): number {
  const matchDrain = weeklyMinutes * 0.12;
  const intensityNorm = normalizeTrainingIntensity(intensity);
  const trainingDrain = Math.max(0, (intensityNorm - 100) * 0.04);
  const lightWeekBonus = weeklyMinutes < 30 ? 3 : 0;
  const baseRecovery = (weeklyMinutes < 45 ? 9 : 5) * regenFactor + lightWeekBonus;
  const trainingRecovery = intensityNorm < 95 ? (95 - intensityNorm) * 0.05 : 0;
  const idleRecovery =
    weeklyMinutes <= 0 ? fitnessRecoveryDelta(fitness, IDLE_WEEK_FITNESS_FRACTION) : 0;
  return (
    clampFitness(
      fitness - matchDrain - trainingDrain + baseRecovery + trainingRecovery + idleRecovery,
    ) - fitness
  );
}

export function applyWeeklyFitness(player: Player, context: WeeklyFitnessContext): Player {
  if (player.state.injury !== null) return player;
  const regenFactor =
    fitnessCoachRegenFactor(context.coachingStaff) *
    modifierFitnessRegenMultiplier(player) *
    (context.precinctRegen ?? 1);
  const delta = weeklyFitnessDelta(
    player.state.fitness,
    player.state.weekly_minutes,
    context.intensity,
    regenFactor,
  );
  if (delta === 0) return player;
  return {
    ...player,
    state: {
      ...player.state,
      fitness: clampFitness(player.state.fitness + delta),
    },
  };
}

export function applyWeeklyFitnessBatch(
  players: readonly Player[],
  context: WeeklyFitnessContext,
): Player[] {
  return players.map((player) => applyWeeklyFitness(player, context));
}

/** 0–100 — higher means more injury risk at current load. */
export function injuryRiskScore(
  player: Player,
  intensity: number,
  injuryRiskFactor = 1,
): number {
  if (player.state.injury !== null) return 100;
  const fitnessGap = Math.max(0, 72 - player.state.fitness);
  const minuteLoad = Math.min(100, player.state.weekly_minutes * 0.9);
  const recent = player.state.recent_weekly_minutes ?? [];
  const recentLoad = Math.min(40, recent.slice(-2).reduce((sum, minutes) => sum + minutes, 0) * 0.12);
  const intensityLoad = (trainingIntensityMultiplier(intensity) - 1) * 55;
  const tiredPenalty = isPlayerTired(player) ? 18 : 0;
  return Math.min(
    100,
    Math.round(
      (fitnessGap * 0.55 + minuteLoad * 0.35 + recentLoad + intensityLoad + tiredPenalty) *
        injuryRiskFactor,
    ),
  );
}

export function playerInjuryRisk(
  player: Player,
  intensity: number,
  injuryRiskFactor = 1,
): InjuryRiskSummary {
  const score = injuryRiskScore(player, intensity, injuryRiskFactor);
  if (score >= 70) {
    return { ampel: "risk", icon: "◆", label: `Verletzungsrisiko hoch (${score})`, score };
  }
  if (score >= 40) {
    return { ampel: "watch", icon: "▲", label: `Risiko beobachten (${score})`, score };
  }
  return { ampel: "good", icon: "●", label: `Risiko niedrig (${score})`, score };
}
