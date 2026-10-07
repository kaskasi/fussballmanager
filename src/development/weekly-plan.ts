import type { Attributes } from "../types/player.ts";
import { calculateWeeklyGrowth, trainingFocus, type FocusSlots } from "./growth-engine.ts";

/**
 * Club weekly training plan (F2.1, PRD 02.4).
 *
 * Fifteen sessions (Mo–Fr, three per day), at most three marked focus,
 * at most two focus sessions on one group. A focus session raises
 * `trainingFocus` for every attribute in that group. A normal session does not.
 *
 * Physical and mental membership follows the σ groups in PRD 02.3.
 * PRD 02.4 only writes the technical list.
 * Intensity scales growth via `training-load.ts`; fatigue ampel is UI-only (F2.1).
 */

export const TRAINING_DAYS = ["Mo", "Di", "Mi", "Do", "Fr"] as const;
export const UNITS_PER_DAY = 3;
export const SLOT_COUNT = TRAINING_DAYS.length * UNITS_PER_DAY;
export const MAX_FOCUS_SLOTS = 2;
export const MAX_FOCUS_PER_GROUP = 2;

export type SessionGroup = "technical" | "physical" | "mental";

export interface TrainingSession {
  group: SessionGroup;
  focus: boolean;
}

export interface PlanCheck {
  valid: boolean;
  errors: string[];
}

const TECHNICAL = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "weak_foot",
] as const satisfies readonly (keyof Attributes)[];

const PHYSICAL = [
  "pace",
  "strength",
  "stamina",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

const MENTAL = [
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
] as const satisfies readonly (keyof Attributes)[];

const GROUPS: readonly SessionGroup[] = ["technical", "physical", "mental"];

export function sessionGroup(attribute: keyof Attributes): SessionGroup {
  if ((TECHNICAL as readonly string[]).includes(attribute)) return "technical";
  if ((PHYSICAL as readonly string[]).includes(attribute)) return "physical";
  return "mental";
}

export function attributesIn(group: SessionGroup): readonly (keyof Attributes)[] {
  if (group === "technical") return TECHNICAL;
  if (group === "physical") return PHYSICAL;
  return MENTAL;
}

export function validateWeeklyPlan(sessions: readonly TrainingSession[]): PlanCheck {
  const errors: string[] = [];
  if (sessions.length !== SLOT_COUNT) {
    errors.push(`a week has ${SLOT_COUNT} sessions, received ${sessions.length}`);
  }
  for (const session of sessions) {
    if (!GROUPS.includes(session.group)) {
      errors.push(`unknown session group ${String(session.group)}`);
    }
  }
  const focus = sessions.filter((session) => session.focus).length;
  if (focus > MAX_FOCUS_SLOTS) {
    errors.push(`at most ${MAX_FOCUS_SLOTS} focus sessions, received ${focus}`);
  }
  for (const group of GROUPS) {
    const onGroup = sessions.filter((session) => session.focus && session.group === group).length;
    if (onGroup > MAX_FOCUS_PER_GROUP) {
      errors.push(`at most ${MAX_FOCUS_PER_GROUP} focus sessions on ${group}, received ${onGroup}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function focusCount(sessions: readonly TrainingSession[], group: SessionGroup): number {
  return sessions.filter((session) => session.focus && session.group === group).length;
}

/** Focus slots that `trainingFocus` should see for this attribute. */
export function focusSlotsFor(sessions: readonly TrainingSession[], attribute: keyof Attributes): FocusSlots {
  const check = validateWeeklyPlan(sessions);
  if (!check.valid) {
    throw new Error(check.errors.join("; "));
  }
  const count = focusCount(sessions, sessionGroup(attribute));
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

export function weeklyFocusMultiplier(
  sessions: readonly TrainingSession[],
  attribute: keyof Attributes,
  injured: boolean,
): number {
  return trainingFocus(focusSlotsFor(sessions, attribute), injured);
}

/** Same age-19 passing case as PRD 02.7, with this plan's focus applied. */
export function passingGrowthForPlan(sessions: readonly TrainingSession[]): number {
  return calculateWeeklyGrowth({
    age: 19,
    maturityOffset: 0,
    attribute: "passing",
    value: 100,
    anlage: 1.2,
    drive: 1.4,
    minutes: 90,
    injured: false,
    focusSlots: focusSlotsFor(sessions, "passing"),
    noise: 1,
  });
}
