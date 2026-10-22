/**
 * How many individual programs run at once (ADR 0002, PRD 09.2 Screen 1a).
 * Slots come from the Gelände (Trainingszentrum, Trainingsplatz) and from hired coaches.
 * Losing a slot never cancels a running program; it only blocks new ones.
 */
import { COACH_ROLES, type CoachingStaff } from "../staff/coaching-staff.ts";
import {
  dockedOccupiedCells,
  precinctBuildingLevel,
  precinctTrainingPitchLevel,
  type PrecinctState,
} from "../stadium/precinct.ts";

export const INDIVIDUAL_SLOTS_BASE = 1;
export const INDIVIDUAL_SLOTS_CAP = 8;
/** Trainingszentrum level → extra slots (index = level). */
const TRAINING_CENTRE_SLOTS = [0, 1, 1, 2, 2, 3] as const;
const TRAINING_PITCH_SLOT_LEVEL = 2;

export type SlotSource = "base" | "training_centre" | "training_pitch" | "coaches";

export interface SlotPart {
  source: SlotSource;
  slots: number;
  level?: number;
}

/** An upgrade that would add a slot: a building level to reach, or a coach to hire. */
export interface SlotUnlock {
  source: Exclude<SlotSource, "base">;
  level?: number;
}

export interface IndividualSlots {
  total: number;
  parts: SlotPart[];
  next: SlotUnlock[];
}

export interface SlotFacilities {
  trainingCentreLevel: number;
  trainingPitchLevel: number;
  coaches: number;
}

export function individualSlotsFromFacilities(facilities: SlotFacilities): IndividualSlots {
  const centreLevel = Math.max(0, Math.min(5, facilities.trainingCentreLevel));
  const centre = TRAINING_CENTRE_SLOTS[centreLevel] ?? 0;
  const pitch = facilities.trainingPitchLevel >= TRAINING_PITCH_SLOT_LEVEL ? 1 : 0;
  const coaches = Math.max(0, Math.min(COACH_ROLES.length, facilities.coaches));

  const parts: SlotPart[] = [{ source: "base", slots: INDIVIDUAL_SLOTS_BASE }];
  if (centre > 0) parts.push({ source: "training_centre", slots: centre, level: centreLevel });
  if (pitch > 0) parts.push({ source: "training_pitch", slots: pitch, level: facilities.trainingPitchLevel });
  if (coaches > 0) parts.push({ source: "coaches", slots: coaches });

  const next: SlotUnlock[] = [];
  const nextCentre = TRAINING_CENTRE_SLOTS.findIndex((slots, level) => level > centreLevel && slots > centre);
  if (nextCentre > 0) next.push({ source: "training_centre", level: nextCentre });
  if (pitch === 0) next.push({ source: "training_pitch", level: TRAINING_PITCH_SLOT_LEVEL });
  if (coaches < COACH_ROLES.length) next.push({ source: "coaches" });

  const sum = parts.reduce((total, part) => total + part.slots, 0);
  return { total: Math.min(INDIVIDUAL_SLOTS_CAP, sum), parts, next };
}

/** Session adapter: a building counts only when built and docked to the street network. */
export function individualTrainingSlots(
  precinct: PrecinctState | undefined,
  staff: CoachingStaff,
): IndividualSlots {
  const centreLevel =
    precinct && dockedOccupiedCells(precinct, "training_ground") > 0
      ? precinctBuildingLevel(precinct, "training_ground")
      : 0;
  return individualSlotsFromFacilities({
    trainingCentreLevel: centreLevel,
    trainingPitchLevel: precinctTrainingPitchLevel(precinct),
    coaches: COACH_ROLES.filter((role) => staff[role] !== null).length,
  });
}

/** A player who already trains keeps his slot (edit); anyone else needs a free one. */
export function isIndividualSlotFree(
  programs: readonly { playerId: string }[],
  playerId: string,
  maxSlots: number,
): boolean {
  if (programs.some((entry) => entry.playerId === playerId)) return true;
  return programs.length < maxSlots;
}
