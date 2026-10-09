import type { PitchPosition } from "./pitch.ts";
import type { PlayerRole } from "./player.ts";

export const FORMATION_IDS = [
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "4-2-2-1-1",
  "5-3-2",
  "5-4-1",
  "2-3-5",
] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

export type FormationSlotId =
  | "GK"
  | "LB"
  | "LCB"
  | "RCB"
  | "RB"
  | "DM"
  | "LDM"
  | "RDM"
  | "LCM"
  | "RCM"
  | "AM"
  | "CB"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "ST"
  | "LST"
  | "RST";

export type FormationSlot = {
  id: FormationSlotId;
  role: PlayerRole;
  /** Kickoff shape for the home team (attacks toward x = 100). */
  homePosition: PitchPosition;
};

function slot(
  id: FormationSlotId,
  role: PlayerRole,
  x: number,
  y: number,
): FormationSlot {
  return { id, role, homePosition: { x, y } };
}

export const FORMATION_433: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 20, 14),
  slot("LCB", "CB", 18, 38),
  slot("RCB", "CB", 18, 62),
  slot("RB", "FB", 20, 86),
  slot("DM", "DM", 34, 50),
  slot("LCM", "CM", 42, 32),
  slot("RCM", "CM", 42, 68),
  slot("LW", "W", 64, 16),
  slot("ST", "ST", 70, 50),
  slot("RW", "W", 64, 84),
];

export const FORMATION_442: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 20, 14),
  slot("LCB", "CB", 18, 38),
  slot("RCB", "CB", 18, 62),
  slot("RB", "FB", 20, 86),
  slot("LM", "W", 48, 16),
  slot("LCM", "CM", 40, 38),
  slot("RCM", "CM", 40, 62),
  slot("RM", "W", 48, 84),
  slot("LST", "ST", 68, 38),
  slot("RST", "ST", 68, 62),
];

/** 4-5-1 — wide midfield five, lone CF. */
export const FORMATION_451: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 20, 14),
  slot("LCB", "CB", 18, 38),
  slot("RCB", "CB", 18, 62),
  slot("RB", "FB", 20, 86),
  slot("LM", "W", 42, 12),
  slot("LCM", "CM", 40, 36),
  slot("DM", "DM", 36, 50),
  slot("RCM", "CM", 40, 64),
  slot("RM", "W", 42, 88),
  slot("ST", "ST", 70, 50),
];

/** 4-2-2-1-1 — double pivot, wide 10s, central AM, CF. */
export const FORMATION_42211: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 20, 14),
  slot("LCB", "CB", 18, 38),
  slot("RCB", "CB", 18, 62),
  slot("RB", "FB", 20, 86),
  slot("LDM", "DM", 32, 42),
  slot("RDM", "DM", 32, 58),
  slot("LM", "W", 52, 16),
  slot("RM", "W", 52, 84),
  slot("AM", "AM", 60, 50),
  slot("ST", "ST", 72, 50),
];

/** 5-3-2 — wing-backs, back three, two strikers. */
export const FORMATION_532: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 22, 10),
  slot("LCB", "CB", 17, 32),
  slot("CB", "CB", 15, 50),
  slot("RCB", "CB", 17, 68),
  slot("RB", "FB", 22, 90),
  slot("LCM", "CM", 42, 34),
  slot("DM", "DM", 38, 50),
  slot("RCM", "CM", 42, 66),
  slot("LST", "ST", 68, 38),
  slot("RST", "ST", 68, 62),
];

/** 5-4-1 — low block, flat midfield four. */
export const FORMATION_541: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 22, 10),
  slot("LCB", "CB", 17, 32),
  slot("CB", "CB", 15, 50),
  slot("RCB", "CB", 17, 68),
  slot("RB", "FB", 22, 90),
  slot("LM", "W", 44, 14),
  slot("LCM", "CM", 42, 38),
  slot("RCM", "CM", 42, 62),
  slot("RM", "W", 44, 86),
  slot("ST", "ST", 70, 50),
];

export const FORMATION_235: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 16, 38),
  slot("RB", "FB", 16, 62),
  slot("LCM", "CM", 36, 28),
  slot("DM", "DM", 34, 50),
  slot("RCM", "CM", 36, 72),
  slot("LW", "W", 68, 10),
  slot("LST", "ST", 70, 30),
  slot("ST", "ST", 74, 50),
  slot("RST", "ST", 70, 70),
  slot("RW", "W", 68, 90),
];

const FORMATIONS: Record<FormationId, readonly FormationSlot[]> = {
  "4-3-3": FORMATION_433,
  "4-4-2": FORMATION_442,
  "4-5-1": FORMATION_451,
  "4-2-2-1-1": FORMATION_42211,
  "5-3-2": FORMATION_532,
  "5-4-1": FORMATION_541,
  "2-3-5": FORMATION_235,
};

export function getFormation(id: FormationId): readonly FormationSlot[] {
  return FORMATIONS[id];
}

export function getFormationSlot(
  id: FormationId,
  slotId: FormationSlotId,
): FormationSlot {
  const found = getFormation(id).find((entry) => entry.id === slotId);
  if (!found) {
    throw new Error(`Formation ${id} has no slot ${slotId}`);
  }
  return found;
}

/** Away team attacks toward x = 0; rotate the home shape 180°. */
export function awayKickoffPosition(home: PitchPosition): PitchPosition {
  return { x: 100 - home.x, y: 100 - home.y };
}
