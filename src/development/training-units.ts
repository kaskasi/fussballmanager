import type { Attributes } from "../types/player.ts";
import { SLOT_COUNT, TRAINING_DAYS, UNITS_PER_DAY, type TrainingSession } from "./weekly-plan.ts";

/** Named units for the team timetable. Each maps to one PRD 02.4 group. */
export interface TrainingUnit {
  id: string;
  label: string;
  group: TrainingSession["group"];
  /** Skills shown on the card — display only in M1. */
  skills: (keyof Attributes)[];
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
    { unitId: "phys_power", focus: false },
    { unitId: "ment_calm", focus: false },
    { unitId: "tech_shoot", focus: false },
    { unitId: "phys_speed", focus: true },
    { unitId: "ment_leader", focus: false },
    { unitId: "tech_pass", focus: false },
    { unitId: "phys_power", focus: false },
    { unitId: "ment_tactical", focus: false },
    { unitId: "tech_ball", focus: false },
    { unitId: "phys_speed", focus: false },
    { unitId: "ment_calm", focus: false },
  ];
}

export function planToSessions(plan: readonly TrainingSlot[]): TrainingSession[] {
  return plan.map((slot) => ({
    group: trainingUnit(slot.unitId).group,
    focus: slot.focus,
  }));
}

export function unitsForGroup(group: TrainingSession["group"]): TrainingUnit[] {
  return TRAINING_UNITS.filter((unit) => unit.group === group);
}

export function createInitialTrainingPlan(): TrainingSlot[] {
  const plan = defaultTrainingPlan();
  if (plan.length !== SLOT_COUNT) {
    throw new Error(`default training plan has ${plan.length} slots, expected ${SLOT_COUNT}`);
  }
  return plan;
}
