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
  /** Pitch units the shape pushes this slot up (+) or drops it back (−); set only by a moved slot. */
  depthShift?: number;
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

/**
 * Zones a slot can be moved to on the lineup board (F1.6): every formation slot id plus the
 * libero, the wing-backs, a central CM and the inside-forward AM spots.
 */
export const PITCH_ZONE_IDS = [
  "GK",
  "SW",
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "LDM",
  "DM",
  "RDM",
  "RWB",
  "LM",
  "LCM",
  "CM",
  "RCM",
  "RM",
  "LW",
  "LAM",
  "AM",
  "RAM",
  "RW",
  "LST",
  "ST",
  "RST",
] as const;
export type PitchZoneId = (typeof PITCH_ZONE_IDS)[number];

export type PitchZone = {
  id: PitchZoneId;
  role: PlayerRole;
  homePosition: PitchPosition;
  depthShift: number;
};

function zone(id: PitchZoneId, role: PlayerRole, x: number, y: number, depthShift = 0): PitchZone {
  return { id, role, homePosition: { x, y }, depthShift };
}

const PITCH_ZONES: Record<PitchZoneId, PitchZone> = {
  GK: zone("GK", "GK", 6, 50),
  // Libero: a centre-back who sweeps behind the line instead of holding it.
  SW: zone("SW", "CB", 12, 50, -6),
  LB: zone("LB", "FB", 20, 14),
  LCB: zone("LCB", "CB", 18, 36),
  CB: zone("CB", "CB", 18, 50),
  RCB: zone("RCB", "CB", 18, 64),
  RB: zone("RB", "FB", 20, 86),
  // Wing-backs: full-backs who hold the flank one line higher.
  LWB: zone("LWB", "FB", 30, 10, 7),
  LDM: zone("LDM", "DM", 32, 40),
  DM: zone("DM", "DM", 34, 50),
  RDM: zone("RDM", "DM", 32, 60),
  RWB: zone("RWB", "FB", 30, 90, 7),
  LM: zone("LM", "W", 46, 14),
  LCM: zone("LCM", "CM", 42, 34),
  CM: zone("CM", "CM", 42, 50),
  RCM: zone("RCM", "CM", 42, 66),
  RM: zone("RM", "W", 46, 86),
  LW: zone("LW", "W", 64, 14),
  LAM: zone("LAM", "AM", 58, 34),
  AM: zone("AM", "AM", 60, 50),
  RAM: zone("RAM", "AM", 58, 66),
  RW: zone("RW", "W", 64, 86),
  LST: zone("LST", "ST", 68, 38),
  ST: zone("ST", "ST", 70, 50),
  RST: zone("RST", "ST", 68, 62),
};

export function getPitchZone(id: PitchZoneId): PitchZone {
  return PITCH_ZONES[id];
}

export function isPitchZoneId(value: unknown): value is PitchZoneId {
  return typeof value === "string" && (PITCH_ZONE_IDS as readonly string[]).includes(value);
}

/** Slots moved off their formation spot, keyed by slot. A missing slot sits where the formation puts it. */
export type SlotZones = Partial<Record<FormationSlotId, PitchZoneId>>;

/** The zone a slot occupies: its override, else the zone named like the slot. */
export function slotZoneId(slotId: FormationSlotId, zones: SlotZones | undefined): PitchZoneId {
  return zones?.[slotId] ?? slotId;
}

/** One slot with its zone override applied (role, kickoff spot, depth shift). */
export function formationSlotFor(
  formation: FormationId,
  slotId: FormationSlotId,
  zones: SlotZones | undefined,
): FormationSlot | undefined {
  const base = getFormation(formation).find((entry) => entry.id === slotId);
  const override = zones?.[slotId];
  if (!base || !override) {
    return base;
  }
  const moved = PITCH_ZONES[override];
  return { id: base.id, role: moved.role, homePosition: moved.homePosition, depthShift: moved.depthShift };
}

/** The formation with every moved slot on its zone. Without overrides this is the formation itself. */
export function effectiveFormation(
  formation: FormationId,
  zones: SlotZones | undefined,
): readonly FormationSlot[] {
  const slots = getFormation(formation);
  if (!zones || Object.keys(zones).length === 0) {
    return slots;
  }
  return slots.map((slot) => formationSlotFor(formation, slot.id, zones) ?? slot);
}

/**
 * Keep only overrides the formation can take: known slots, known zones, the keeper stays in goal,
 * nobody else goes there, no two slots share a zone, and a slot moved back home drops its entry.
 * Returns undefined when nothing is moved.
 */
export function sanitizeSlotZones(formation: FormationId, raw: unknown): SlotZones | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const slots = getFormation(formation);
  const value = raw as Record<string, unknown>;
  const zones: SlotZones = {};
  for (const slot of slots) {
    const wanted = value[slot.id];
    if (slot.id !== "GK" && isPitchZoneId(wanted) && wanted !== "GK" && wanted !== slot.id) {
      zones[slot.id] = wanted;
    }
  }
  // A move into a taken zone is dropped; that slot goes home, which may clash again, so repeat.
  for (let clash = true; clash; ) {
    clash = false;
    const holder = new Map<PitchZoneId, FormationSlotId>();
    for (const slot of slots) {
      const at = slotZoneId(slot.id, zones);
      const first = holder.get(at);
      if (first === undefined) {
        holder.set(at, slot.id);
        continue;
      }
      // The slot standing on its own zone keeps it; otherwise the earlier mover does.
      delete zones[zones[slot.id] ? slot.id : first];
      clash = true;
      break;
    }
  }
  return Object.keys(zones).length > 0 ? zones : undefined;
}

/** Away team attacks toward x = 0; rotate the home shape 180°. */
export function awayKickoffPosition(home: PitchPosition): PitchPosition {
  return { x: 100 - home.x, y: 100 - home.y };
}
