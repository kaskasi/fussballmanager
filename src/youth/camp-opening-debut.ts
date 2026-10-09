import type { PositionPrimary } from "../types/player.ts";
import type { YouthCampNation } from "./satellite-camps.ts";

/** Headline vs support CA band (PRD 03.6 purchase payoff). */
export const CAMP_OPENING_HEADLINE_MEAN_SHIFT = 28;
export const CAMP_OPENING_SUPPORT_MEAN_SHIFT = 6;
export const CAMP_OPENING_TOTAL_PLAYERS = 3;

const HEADLINE_POSITIONS: readonly PositionPrimary[] = ["CF", "LW", "RW", "AM"];

export function pickCampHeadlinePosition(random: () => number): PositionPrimary {
  const index = Math.floor(random() * HEADLINE_POSITIONS.length);
  return HEADLINE_POSITIONS[index] ?? "CF";
}

export function campDebutHookIndex(campId: string, masterSeed: number, season: number): number {
  let hash = 2166136261;
  for (const char of `${masterSeed}:${campId}:${season}:debut-hook`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 4;
}

export function campDebutHookKey(campId: string, hookIndex: number): string {
  const code = campId.replace(/^camp_/, "");
  return `youth.camp.debut.hook.${code}.${hookIndex}`;
}

export function campDebutRegionLabel(nation: YouthCampNation): string {
  return `${nation.label} · ${nation.region}`;
}
