import type { PitchPosition } from "./pitch.ts";
import type { PlayerRole } from "./player.ts";

export const FORMATION_IDS = ["4-3-3", "4-4-2", "2-3-5"] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

export type FormationSlotId =
  | "GK"
  | "LB"
  | "LCB"
  | "RCB"
  | "RB"
  | "DM"
  | "LCM"
  | "RCM"
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

export const FORMATION_235: readonly FormationSlot[] = [
  slot("GK", "GK", 6, 50),
  slot("LB", "FB", 24, 32),
  slot("RB", "FB", 24, 68),
  slot("LCM", "CM", 40, 22),
  slot("DM", "DM", 38, 50),
  slot("RCM", "CM", 40, 78),
  slot("LW", "W", 70, 8),
  slot("LST", "ST", 68, 32),
  slot("ST", "ST", 74, 50),
  slot("RST", "ST", 68, 68),
  slot("RW", "W", 70, 92),
];

const FORMATIONS: Record<FormationId, readonly FormationSlot[]> = {
  "4-3-3": FORMATION_433,
  "4-4-2": FORMATION_442,
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
