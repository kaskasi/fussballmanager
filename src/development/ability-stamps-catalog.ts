import type { Attributes, StampPath } from "../types/player.ts";

/**
 * F2.8 catalog — mirrored from `/data/development/ability_stamps.json`
 * so the client bundle does not resolve files outside `src`.
 */

export interface StampAttributeGates {
  attributes?: Partial<Record<keyof Attributes, number>>;
  season_goals?: number;
  season_yellow_cards?: number;
  career_apps?: number;
}

export interface StampDefinition {
  id: string;
  label: string;
  icon: string;
  path: StampPath;
  weeks?: number;
  gates: StampAttributeGates;
  applied: Partial<Record<keyof Attributes, number>>;
}

export const ABILITY_STAMPS: readonly StampDefinition[] = [
  {
    id: "kopfballungeheuer",
    label: "Kopfballungeheuer",
    icon: "🧠",
    path: "train",
    weeks: 10,
    gates: { attributes: { strength: 100, positioning: 90 } },
    applied: { strength: 3, positioning: 2 },
  },
  {
    id: "geolter_blitz",
    label: "Geölter Blitz",
    icon: "⚡",
    path: "train",
    weeks: 8,
    gates: { attributes: { pace: 100, stamina: 85 } },
    applied: { pace: 3, stamina: 2 },
  },
  {
    id: "spielmacher_blick",
    label: "Spielmacher-Blick",
    icon: "👁",
    path: "train",
    weeks: 10,
    gates: { attributes: { vision: 100, passing: 95 } },
    applied: { vision: 3, passing: 2 },
  },
  {
    id: "torjaeger_saison",
    label: "Torjäger",
    icon: "⚽",
    path: "event",
    gates: { season_goals: 25 },
    applied: { shooting: 3, composure: 2 },
  },
  {
    id: "alter_recke",
    label: "Alter Recke",
    icon: "🛡",
    path: "event",
    gates: { career_apps: 300 },
    applied: { leadership: 3, concentration: 2 },
  },
  {
    id: "treter",
    label: "Treter",
    icon: "🟨",
    path: "event",
    gates: { season_yellow_cards: 13 },
    applied: { strength: 2, composure: 2 },
  },
] as const;

export const ACTIVE_STAMP_BADGE_SLOTS = 3;
