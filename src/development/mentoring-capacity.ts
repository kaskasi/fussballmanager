/**
 * How many mentor pairs run at once (PRD F2.4, same model as ADR 0002).
 * Slots come from the Gelände: the Vereinsgebäude (Gemeinschaftsraum, zusammen zocken)
 * and the Restaurant (gemeinsames Essen). Losing a slot never ends a running pairing;
 * it only blocks new ones.
 */
import { dockedOccupiedCells, precinctBuildingLevel, type PrecinctState } from "../stadium/precinct.ts";

export const MENTORING_SLOTS_BASE = 2;
export const MENTORING_SLOTS_CAP = 5;
/** Vereinsgebäude level → extra slots (index = level). */
const CLUBHOUSE_SLOTS = [0, 1, 2] as const;
const CLUBHOUSE_MAX_LEVEL = CLUBHOUSE_SLOTS.length - 1;
const RESTAURANT_SLOTS = 1;

export type MentoringSlotSource = "base" | "clubhouse" | "restaurant";

export interface MentoringSlotPart {
  source: MentoringSlotSource;
  slots: number;
  level?: number;
}

/** A building (or building level) that would add a slot. */
export interface MentoringSlotUnlock {
  source: Exclude<MentoringSlotSource, "base">;
  level?: number;
}

export interface MentoringSlots {
  total: number;
  parts: MentoringSlotPart[];
  next: MentoringSlotUnlock[];
}

export interface MentoringFacilities {
  clubhouseLevel: number;
  restaurant: boolean;
}

export function mentoringSlotsFromFacilities(facilities: MentoringFacilities): MentoringSlots {
  const clubhouseLevel = Math.max(0, Math.min(CLUBHOUSE_MAX_LEVEL, facilities.clubhouseLevel));
  const clubhouse = CLUBHOUSE_SLOTS[clubhouseLevel] ?? 0;
  const restaurant = facilities.restaurant ? RESTAURANT_SLOTS : 0;

  const parts: MentoringSlotPart[] = [{ source: "base", slots: MENTORING_SLOTS_BASE }];
  if (clubhouse > 0) parts.push({ source: "clubhouse", slots: clubhouse, level: clubhouseLevel });
  if (restaurant > 0) parts.push({ source: "restaurant", slots: restaurant });

  const next: MentoringSlotUnlock[] = [];
  if (clubhouseLevel < CLUBHOUSE_MAX_LEVEL) next.push({ source: "clubhouse", level: clubhouseLevel + 1 });
  if (restaurant === 0) next.push({ source: "restaurant" });

  const sum = parts.reduce((total, part) => total + part.slots, 0);
  return { total: Math.min(MENTORING_SLOTS_CAP, sum), parts, next };
}

/** Session adapter: a building counts only when built and docked to the street network. */
export function mentoringSlots(precinct: PrecinctState | undefined): MentoringSlots {
  const clubhouseLevel =
    precinct && dockedOccupiedCells(precinct, "clubhouse") > 0
      ? precinctBuildingLevel(precinct, "clubhouse")
      : 0;
  const restaurant =
    !!precinct &&
    dockedOccupiedCells(precinct, "restaurant") > 0 &&
    precinctBuildingLevel(precinct, "restaurant") > 0;
  return mentoringSlotsFromFacilities({ clubhouseLevel, restaurant });
}

/** Mentor pairs currently running at the club (one per mentee). */
export function activeMentorships(
  players: readonly { club_id: string | null; state: { mentorship?: unknown } }[],
  clubId: string,
): number {
  return players.filter((player) => player.club_id === clubId && player.state.mentorship).length;
}
