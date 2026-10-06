import type { Player } from "../types/player.ts";
import type { TrainingSlot } from "./training-units.ts";
import { weeklyFocusCount } from "./training-plan-state.ts";

export const TRAINING_NEGLECT_FANBASE_PENALTY = -1.5;
export const TRAINING_NEGLECT_BOARD_PRESSURE = 8;
export const TRAINING_NEGLECT_MORALE_DELTA = -2;

export function isTrainingPlanNeglected(plan: readonly TrainingSlot[]): boolean {
  return weeklyFocusCount(plan) === 0;
}

export function applyTrainingNeglectMorale(
  players: readonly Player[],
  clubId: string,
): Player[] {
  return players.map((player) => {
    if (player.club_id !== clubId || player.squad_status !== "pro") return player;
    return {
      ...player,
      state: {
        ...player.state,
        morale: Math.min(100, Math.max(0, player.state.morale + TRAINING_NEGLECT_MORALE_DELTA)),
      },
    };
  });
}
