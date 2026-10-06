import type { Attributes } from "../types/player.ts";
import { emptyWeeklyTrainingPlan, assertWeeklyPlanLength } from "./training-plan-state.ts";
import { SLOT_COUNT, TRAINING_DAYS, UNITS_PER_DAY, type TrainingSession } from "./weekly-plan.ts";

export {
  emptyWeeklyTrainingPlan,
  isTrainingSlotConfigured,
  isTrainingWeekday,
  weeklyFocusCount,
} from "./training-plan-state.ts";

/** Named units for the team timetable. Each maps to one PRD 02.4 group. */
export interface TrainingUnit {
  id: string;
  label: string;
  group: TrainingSession["group"];
  /** Skills shown on the card — display only in M1. */
  skills: (keyof Attributes)[];
  /** Campus gate — Hallentraining needs the upgraded training hall. */
  requires?: "training_hall";
}

export interface TrainingSlot {
  unitId: string;
  focus: boolean;
}

export { TRAINING_DAYS, UNITS_PER_DAY };

export function slotDayIndex(slotIndex: number): number {
  return Math.floor(slotIndex / UNITS_PER_DAY);
}

export function slotPeriodIndex(slotIndex: number): number {
  return slotIndex % UNITS_PER_DAY;
}

export function slotLabel(slotIndex: number): string {
  const day = TRAINING_DAYS[slotDayIndex(slotIndex)] ?? "?";
  if (UNITS_PER_DAY === 1) return day;
  const period = slotPeriodIndex(slotIndex) + 1;
  return `${day} · Einheit ${period}`;
}

export const TRAINING_UNITS: readonly TrainingUnit[] = [
  { id: "tech_pass", label: "Passspiel", group: "technical", skills: ["passing", "vision", "technique"] },
  { id: "tech_shoot", label: "Abschluss", group: "technical", skills: ["shooting", "composure"] },
  { id: "tech_ball", label: "Ballarbeit", group: "technical", skills: ["dribbling", "technique"] },
  { id: "phys_speed", label: "Schnelligkeit", group: "physical", skills: ["pace", "stamina"] },
  { id: "phys_power", label: "Kraft & Zweikampf", group: "physical", skills: ["strength", "stamina"] },
  { id: "phys_gk", label: "TW-Einheit", group: "physical", skills: ["gk_handling", "positioning"] },
  {
    id: "phys_hall",
    label: "Hallentraining",
    group: "physical",
    skills: ["pace", "technique", "stamina"],
    requires: "training_hall",
  },
  { id: "ment_tactical", label: "Taktik", group: "mental", skills: ["positioning", "vision", "teamwork"] },
  { id: "ment_calm", label: "Ruhe & Fokus", group: "mental", skills: ["composure", "concentration"] },
  { id: "ment_leader", label: "Führung", group: "mental", skills: ["leadership", "teamwork"] },
];

const UNIT_BY_ID = new Map(TRAINING_UNITS.map((unit) => [unit.id, unit]));

export function trainingUnit(id: string): TrainingUnit {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) throw new Error(`Unknown training unit ${id}`);
  return unit;
}

export function defaultTrainingPlan(): TrainingSlot[] {
  return [
    { unitId: "tech_pass", focus: true },
    { unitId: "phys_speed", focus: false },
    { unitId: "ment_tactical", focus: false },
    { unitId: "tech_ball", focus: true },
    { unitId: "phys_power", focus: true },
  ];
}

const LEGACY_SLOTS_PER_WEEK = 15;

/** Converts a pre-025 fifteen-slot week (Mo–Fr × 3) to five weekday slots. */
export function migrateLegacyTrainingPlan(plan: readonly TrainingSlot[]): TrainingSlot[] {
  if (plan.length === SLOT_COUNT) return [...plan];
  if (plan.length === LEGACY_SLOTS_PER_WEEK) {
    return [0, 3, 6, 9, 12].map((index) => plan[index]!).filter(Boolean);
  }
  return createInitialTrainingPlan();
}

export function planToSessions(plan: readonly TrainingSlot[]): TrainingSession[] {
  return plan.map((slot) => ({
    group: trainingUnit(slot.unitId).group,
    focus: slot.focus,
  }));
}

export function trainingUnitUnlocked(
  unit: TrainingUnit,
  unlocks?: { hasTrainingHall?: boolean },
): boolean {
  if (unit.requires === "training_hall") return unlocks?.hasTrainingHall === true;
  return true;
}

export function unitsForGroup(
  group: TrainingSession["group"],
  unlocks?: { hasTrainingHall?: boolean },
): TrainingUnit[] {
  return TRAINING_UNITS.filter(
    (unit) => unit.group === group && trainingUnitUnlocked(unit, unlocks ?? { hasTrainingHall: false }),
  );
}

export function createInitialTrainingPlan(): TrainingSlot[] {
  const plan = emptyWeeklyTrainingPlan();
  assertWeeklyPlanLength(plan);
  return plan;
}
