import type { Attributes } from "../types/player.ts";
import {
  MASSAGE_UNIT_FITNESS_FRACTION,
  RECOVERY_UNIT_FITNESS_FRACTION,
} from "./fitness-management.ts";
import {
  emptyTrainingSlot,
  emptyWeeklyTrainingPlan,
  assertWeeklyPlanLength,
  isTrainingSlotEmpty,
} from "./training-plan-state.ts";
import {
  trainingPeriodShortLabel,
  trainingSlotDayUnitLabel,
} from "../i18n/training-schedule-display.ts";
import { t } from "../i18n/index.ts";
import { MONDAY, SATURDAY } from "../sim/day-calendar.ts";
import { SLOT_COUNT, TRAINING_DAYS, UNITS_PER_DAY, type TrainingSession } from "./weekly-plan.ts";

export {
  EMPTY_TRAINING_UNIT_ID,
  emptyTrainingSlot,
  emptyWeeklyTrainingPlan,
  isTrainingSlotConfigured,
  isTrainingSlotEmpty,
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
  /** Campus gates — hall / outdoor pitch / medical center upgrades on the Gelände. */
  requires?: "training_hall" | "training_pitch_2" | "training_pitch_3" | "medical_center_2";
  /** Premium campus units — stronger gains when the slot runs (Halle). */
  growthBoost?: number;
  /** Closes this fraction of the gap to Fit 100 for the whole squad (no skill focus). */
  fitnessRecoveryFraction?: number;
}

export interface TrainingUnlocks {
  hasTrainingHall?: boolean;
  trainingPitchLevel?: number;
  medicalCenterLevel?: number;
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

/** Mo=1 … Fr=5 — matches session `weekday` (PRD day calendar). */
export function trainingSlotWeekday(slotIndex: number): number {
  return slotDayIndex(slotIndex) + MONDAY;
}

/** Past sessions within the current game week (before today; weekend grays Mo–Fr). */
export function isTrainingSlotPast(slotIndex: number, sessionWeekday: number): boolean {
  const slotDay = trainingSlotWeekday(slotIndex);
  if (sessionWeekday >= SATURDAY) return slotDay <= TRAINING_DAYS.length;
  return slotDay < sessionWeekday;
}

export function isTrainingDayPast(dayIndex: number, sessionWeekday: number): boolean {
  return isTrainingSlotPast(dayIndex * UNITS_PER_DAY, sessionWeekday);
}

/** Per-unit NEXT progress (PRD 09.3b) — slot already simulated this week. */
export function isTrainingSlotCompleted(slotIndex: number, unitsCompleted: number): boolean {
  return slotIndex < unitsCompleted;
}

/** Next slot to run via header NEXT; null when the week grid is finished. */
export function currentTrainingSlotIndex(
  unitsCompleted: number,
  useUnitProgress: boolean,
): number | null {
  if (!useUnitProgress) return null;
  if (unitsCompleted >= SLOT_COUNT) return null;
  return unitsCompleted;
}

export function isTrainingSlotPastForSession(
  slotIndex: number,
  sessionWeekday: number,
  unitsCompleted: number,
  useUnitProgress: boolean,
): boolean {
  if (useUnitProgress) {
    return isTrainingSlotCompleted(slotIndex, unitsCompleted);
  }
  return isTrainingSlotPast(slotIndex, sessionWeekday);
}

/** Day column muted only when all three units that day are completed. */
export function isTrainingDayFullyPastForSession(
  dayIndex: number,
  sessionWeekday: number,
  unitsCompleted: number,
  useUnitProgress: boolean,
): boolean {
  const start = dayIndex * UNITS_PER_DAY;
  for (let period = 0; period < UNITS_PER_DAY; period++) {
    if (
      !isTrainingSlotPastForSession(start + period, sessionWeekday, unitsCompleted, useUnitProgress)
    ) {
      return false;
    }
  }
  return true;
}

export function slotLabel(slotIndex: number): string {
  return trainingSlotDayUnitLabel(slotDayIndex(slotIndex), slotPeriodIndex(slotIndex));
}

export function slotPeriodLabel(slotIndex: number): string {
  return trainingPeriodShortLabel(slotPeriodIndex(slotIndex));
}

export const TRAINING_UNITS: readonly TrainingUnit[] = [
  { id: "tech_pass", label: "Passspiel", group: "technical", skills: ["passing", "vision", "technique"] },
  { id: "tech_shoot", label: "Abschluss", group: "technical", skills: ["shooting", "composure"] },
  { id: "tech_ball", label: "Ballarbeit", group: "technical", skills: ["dribbling", "technique"] },
  { id: "phys_speed", label: "Schnelligkeit", group: "physical", skills: ["pace", "stamina"] },
  { id: "phys_power", label: "Kraft & Zweikampf", group: "physical", skills: ["strength", "stamina"] },
  { id: "phys_gk", label: "TW-Einheit", group: "physical", skills: ["gk_handling", "positioning"] },
  {
    id: "tech_hall_touch",
    label: "Ballgefühl Halle",
    group: "technical",
    skills: ["technique", "dribbling", "passing"],
    requires: "training_hall",
    growthBoost: 1.38,
  },
  {
    id: "tech_hall_finish",
    label: "Abschluss Halle",
    group: "technical",
    skills: ["shooting", "technique", "composure"],
    requires: "training_hall",
    growthBoost: 1.35,
  },
  {
    id: "phys_hall",
    label: "Athletik Halle",
    group: "physical",
    skills: ["pace", "stamina", "strength"],
    requires: "training_hall",
    growthBoost: 1.22,
  },
  {
    id: "tech_outdoor",
    label: "Spiel auf dem Platz",
    group: "technical",
    skills: ["passing", "technique", "vision"],
    requires: "training_pitch_2",
  },
  {
    id: "phys_outdoor",
    label: "Sprint auf dem Platz",
    group: "physical",
    skills: ["pace", "stamina"],
    requires: "training_pitch_3",
  },
  { id: "ment_tactical", label: "Taktik", group: "mental", skills: ["positioning", "vision", "teamwork"] },
  { id: "ment_calm", label: "Ruhe & Fokus", group: "mental", skills: ["composure", "concentration"] },
  { id: "ment_leader", label: "Führung", group: "mental", skills: ["leadership", "teamwork"] },
  {
    id: "ment_recovery",
    label: "Erholung",
    group: "mental",
    skills: [],
    fitnessRecoveryFraction: RECOVERY_UNIT_FITNESS_FRACTION,
  },
  {
    id: "ment_massage",
    label: "Erholungsmassagen",
    group: "mental",
    skills: [],
    fitnessRecoveryFraction: MASSAGE_UNIT_FITNESS_FRACTION,
    requires: "medical_center_2",
  },
];

const UNIT_BY_ID = new Map(TRAINING_UNITS.map((unit) => [unit.id, unit]));

export function trainingUnit(id: string): TrainingUnit {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) throw new Error(`Unknown training unit ${id}`);
  return unit;
}

export function defaultTrainingPlan(): TrainingSlot[] {
  const plan = emptyWeeklyTrainingPlan();
  plan[0] = { unitId: "tech_pass", focus: true };
  plan[3] = { unitId: "phys_speed", focus: false };
  plan[6] = { unitId: "ment_tactical", focus: false };
  plan[9] = { unitId: "tech_ball", focus: true };
  plan[12] = { unitId: "phys_power", focus: false };
  return plan;
}

const LEGACY_FIVE_SLOTS_PER_WEEK = 5;

/** Expands one slot per weekday (migration 025) to three per day. */
export function expandFiveDayTrainingPlan(plan: readonly TrainingSlot[]): TrainingSlot[] {
  const out: TrainingSlot[] = [];
  for (let day = 0; day < TRAINING_DAYS.length; day++) {
    const daySlot = plan[day] ?? emptyTrainingSlot();
    out.push(daySlot);
    out.push(emptyTrainingSlot(), emptyTrainingSlot());
  }
  return out;
}

export function migrateLegacyTrainingPlan(plan: readonly TrainingSlot[]): TrainingSlot[] {
  if (plan.length === SLOT_COUNT) return normalizePlaceholderTrainingPlan([...plan]);
  if (plan.length === LEGACY_FIVE_SLOTS_PER_WEEK) {
    return normalizePlaceholderTrainingPlan(expandFiveDayTrainingPlan(plan));
  }
  return createInitialTrainingPlan();
}

/** Old empty weeks used Passspiel on every slot with no focus — show as unset. */
export function normalizePlaceholderTrainingPlan(plan: readonly TrainingSlot[]): TrainingSlot[] {
  if (plan.length !== SLOT_COUNT) return [...plan];
  const legacyPlaceholder = plan.every((slot) => slot.unitId === "tech_pass" && !slot.focus);
  if (legacyPlaceholder) return emptyWeeklyTrainingPlan();
  return [...plan];
}

/** Padding for empty cells — no focus, does not stack growth (weekly-plan tests). */
const EMPTY_SLOT_SESSION: TrainingSession = { group: "mental", focus: false };

export function planToSessions(plan: readonly TrainingSlot[]): TrainingSession[] {
  return plan.map((slot) => {
    if (isTrainingSlotEmpty(slot)) {
      return { ...EMPTY_SLOT_SESSION, focus: false };
    }
    return {
      group: trainingUnit(slot.unitId).group,
      focus: slot.focus,
    };
  });
}

function meetsTrainingRequire(requires: TrainingUnit["requires"], unlocks: TrainingUnlocks): boolean {
  if (!requires) return true;
  if (requires === "training_hall") return unlocks.hasTrainingHall === true;
  if (requires === "training_pitch_2") return (unlocks.trainingPitchLevel ?? 0) >= 2;
  if (requires === "training_pitch_3") return (unlocks.trainingPitchLevel ?? 0) >= 3;
  if (requires === "medical_center_2") return (unlocks.medicalCenterLevel ?? 0) >= 2;
  return true;
}

export function trainingUnitUnlocked(unit: TrainingUnit, unlocks?: TrainingUnlocks): boolean {
  return meetsTrainingRequire(unit.requires, unlocks ?? {});
}

export function unitsForGroup(group: TrainingSession["group"], unlocks?: TrainingUnlocks): TrainingUnit[] {
  return TRAINING_UNITS.filter(
    (unit) => unit.group === group && trainingUnitUnlocked(unit, unlocks ?? {}),
  );
}

export function trainingUnitLockHint(unit: TrainingUnit): string {
  switch (unit.requires) {
    case "training_hall":
      return t("training.unit.lock.trainingHall");
    case "training_pitch_2":
      return t("training.unit.lock.pitch2");
    case "training_pitch_3":
      return t("training.unit.lock.pitch3");
    case "medical_center_2":
      return t("training.unit.lock.medical2");
    default:
      return t("training.unit.lock.default");
  }
}

export function trainingUnitPickerDetail(unit: TrainingUnit, unlocked: boolean): string {
  if (!unlocked) return trainingUnitLockHint(unit);
  if (unit.fitnessRecoveryFraction !== undefined) {
    const pct = Math.round(unit.fitnessRecoveryFraction * 100);
    return t("training.unit.recoveryDetail", { pct });
  }
  return unit.skills
    .map((skill) => {
      const key = `player.attribute.${skill}`;
      const label = t(key);
      return label !== key ? label : skill;
    })
    .join(" · ");
}

export function createInitialTrainingPlan(): TrainingSlot[] {
  const plan = emptyWeeklyTrainingPlan();
  assertWeeklyPlanLength(plan);
  return plan;
}
