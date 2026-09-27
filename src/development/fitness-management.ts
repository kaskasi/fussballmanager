import type { Player } from "../types/player.ts";
import type { CoachingStaff } from "../staff/coaching-staff.ts";
import { coachEnvironmentFactor } from "../staff/coaching-staff.ts";
import { normalizeTrainingIntensity, trainingIntensityMultiplier } from "./training-load.ts";
import type { FatigueAmpel } from "./training-load.ts";

export interface WeeklyFitnessContext {
  intensity: number;
  coachingStaff: CoachingStaff;
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

function clampFitness(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
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
  return clampFitness(fitness - matchDrain - trainingDrain + baseRecovery + trainingRecovery) - fitness;
}

export function applyWeeklyFitness(player: Player, context: WeeklyFitnessContext): Player {
  if (player.state.injury !== null) return player;
  const regenFactor =
    fitnessCoachRegenFactor(context.coachingStaff) * modifierFitnessRegenMultiplier(player);
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
export function injuryRiskScore(player: Player, intensity: number): number {
  if (player.state.injury !== null) return 100;
  const fitnessGap = Math.max(0, 72 - player.state.fitness);
  const minuteLoad = Math.min(100, player.state.weekly_minutes * 0.9);
  const recent = player.state.recent_weekly_minutes ?? [];
  const recentLoad = Math.min(40, recent.slice(-2).reduce((sum, minutes) => sum + minutes, 0) * 0.12);
  const intensityLoad = (trainingIntensityMultiplier(intensity) - 1) * 55;
  const tiredPenalty = isPlayerTired(player) ? 18 : 0;
  return Math.min(
    100,
    Math.round(fitnessGap * 0.55 + minuteLoad * 0.35 + recentLoad + intensityLoad + tiredPenalty),
  );
}

export function playerInjuryRisk(player: Player, intensity: number): InjuryRiskSummary {
  const score = injuryRiskScore(player, intensity);
  if (score >= 70) {
    return { ampel: "risk", icon: "◆", label: `Verletzungsrisiko hoch (${score})`, score };
  }
  if (score >= 40) {
    return { ampel: "watch", icon: "▲", label: `Risiko beobachten (${score})`, score };
  }
  return { ampel: "good", icon: "●", label: `Risiko niedrig (${score})`, score };
}
