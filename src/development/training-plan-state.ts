import { MONDAY } from "../sim/day-calendar.ts";
import type { TrainingSlot } from "./training-units.ts";
import { SLOT_COUNT, TRAINING_DAYS } from "./weekly-plan.ts";

export const TRAINING_WEEKDAY_LAST = 5;

/** Mo–Fr team training days (session weekday 1–5). */
export function isTrainingWeekday(weekday: number): boolean {
  return weekday >= MONDAY && weekday <= TRAINING_WEEKDAY_LAST;
}

export function emptyWeeklyTrainingPlan(): TrainingSlot[] {
  return TRAINING_DAYS.map(() => ({ unitId: "tech_pass", focus: false }));
}

export function weeklyFocusCount(plan: readonly TrainingSlot[]): number {
  return plan.filter((slot) => slot.focus).length;
}

/** True when this weekday’s slot (Mo=1 … Fr=5) has a focus session set. */
export function isTrainingSlotConfigured(plan: readonly TrainingSlot[], weekday: number): boolean {
  if (!isTrainingWeekday(weekday)) return true;
  const index = weekday - MONDAY;
  if (index < 0 || index >= plan.length) return false;
  return plan[index]?.focus === true;
}

export function assertWeeklyPlanLength(plan: readonly TrainingSlot[]): void {
  if (plan.length !== SLOT_COUNT) {
    throw new Error(`training plan has ${plan.length} slots, expected ${SLOT_COUNT}`);
  }
}
