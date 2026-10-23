import type { PlayerAttributes, PlayerMatchStatus } from "@fussballmanager/shared";
import { clamp } from "./helpers.ts";

/**
 * ADR 0003 — the engine is tuned at one skill level. Before kick-off both
 * XIs are shifted towards it together, so an amateur derby and an elite
 * final produce the same kind of football, while the gap between the two
 * sides (and between players) stays intact.
 */
export const MATCH_REFERENCE_SKILL = 60;

/** Share of the league-level offset removed (1 = fully level-free). */
export const LEVEL_POOLING = 0.85;

type Skill = Exclude<keyof PlayerAttributes, "heightCm" | "goalkeeping">;

const OUTFIELD_SKILLS: readonly Skill[] = [
  "passing",
  "tackling",
  "shooting",
  "pace",
  "stamina",
  "positioning",
  "aerial",
  "dribbling",
];

function mean(values: readonly number[]): number {
  return values.length === 0 ? MATCH_REFERENCE_SKILL : values.reduce((a, b) => a + b, 0) / values.length;
}

function shiftToward(level: number): number {
  return LEVEL_POOLING * (MATCH_REFERENCE_SKILL - level);
}

/** Per-skill shift measured on the starting outfielders (and keepers) of both sides. */
export function matchLevelShift(
  players: readonly PlayerMatchStatus[],
): Record<Skill | "goalkeeping", number> {
  const outfield = players.filter((player) => player.onPitch && player.role !== "GK");
  const keepers = players.filter((player) => player.onPitch && player.role === "GK");
  const shift = {} as Record<Skill | "goalkeeping", number>;
  for (const skill of OUTFIELD_SKILLS) {
    shift[skill] = shiftToward(mean(outfield.map((player) => player.attributes[skill])));
  }
  shift.goalkeeping = shiftToward(mean(keepers.map((player) => player.attributes.goalkeeping)));
  return shift;
}

export function normalizeMatchAttributes(
  players: readonly PlayerMatchStatus[],
): PlayerMatchStatus[] {
  const shift = matchLevelShift(players);
  const moved = (value: number, by: number) => clamp(Math.round(value + by), 1, 99);
  return players.map((player) => {
    const attributes: PlayerAttributes = { ...player.attributes };
    for (const skill of OUTFIELD_SKILLS) {
      attributes[skill] = moved(attributes[skill], shift[skill]);
    }
    if (player.role === "GK") {
      attributes.goalkeeping = moved(attributes.goalkeeping, shift.goalkeeping);
    }
    return { ...player, attributes };
  });
}
