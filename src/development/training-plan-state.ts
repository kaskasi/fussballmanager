import { MONDAY } from "../sim/day-calendar.ts";
import type { TrainingSlot } from "./training-units.ts";
import { SLOT_COUNT, TRAINING_DAYS, UNITS_PER_DAY } from "./weekly-plan.ts";

export const TRAINING_WEEKDAY_LAST = 5;

/** Mo–Fr team training days (session weekday 1–5). */
export function isTrainingWeekday(weekday: number): boolean {
  return weekday >= MONDAY && weekday <= TRAINING_WEEKDAY_LAST;
}

/** Unset timetable cell — no default unit (F2.1 empty week after sim). */
export const EMPTY_TRAINING_UNIT_ID = "";

export function emptyTrainingSlot(): TrainingSlot {
  return { unitId: EMPTY_TRAINING_UNIT_ID, focus: false };
}

export function isTrainingSlotEmpty(slot: TrainingSlot | undefined): boolean {
  if (!slot) return true;
  return slot.unitId === EMPTY_TRAINING_UNIT_ID;
}

export function emptyWeeklyTrainingPlan(): TrainingSlot[] {
  return Array.from({ length: SLOT_COUNT }, () => emptyTrainingSlot());
}

export function weeklyFocusCount(plan: readonly TrainingSlot[]): number {
  return plan.filter((slot) => slot.focus).length;
}

/** True when this weekday (Mo=1 … Fr=5) has at least one focus session set. */
export function isTrainingSlotConfigured(plan: readonly TrainingSlot[], weekday: number): boolean {
  if (!isTrainingWeekday(weekday)) return true;
  const dayIndex = weekday - MONDAY;
  if (dayIndex < 0 || dayIndex >= TRAINING_DAYS.length) return false;
  const start = dayIndex * UNITS_PER_DAY;
  const end = start + UNITS_PER_DAY;
  return plan.slice(start, end).some((slot) => slot?.focus === true);
}

export function assertWeeklyPlanLength(plan: readonly TrainingSlot[]): void {
  if (plan.length !== SLOT_COUNT) {
    throw new Error(`training plan has ${plan.length} slots, expected ${SLOT_COUNT}`);
  }
}
