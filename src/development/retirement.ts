import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";

/**
 * PRD 31 §2 — season-end retirement roll (PRD 30 phase 1, F11.3).
 * The roll uses the age the player would play next season at, so a 34-year-old
 * at season end rolls on the 35 row.
 */

export const RETIREMENT_MIN_AGE = 31;
export const RETIREMENT_HARD_STOP_AGE = 40;
/** Keepers last longer: their curve is the outfield curve two years later. */
export const KEEPER_AGE_SHIFT = 2;
const MAX_SOFT_CHANCE = 0.97;

/** Outfield base chance by next-season age; 37+ uses the last row until the hard stop. */
const OUTFIELD_BASE: Record<number, number> = {
  31: 0.02,
  32: 0.05,
  33: 0.12,
  34: 0.35,
  35: 0.6,
  36: 0.8,
  37: 0.9,
};

export interface RetirementContext {
  /** Season that just ended. */
  endingSeason: number;
  masterSeed: number;
}

export function baseRetirementChance(nextSeasonAge: number, goalkeeper: boolean): number {
  if (nextSeasonAge >= RETIREMENT_HARD_STOP_AGE) return 1;
  const curveAge = goalkeeper ? nextSeasonAge - KEEPER_AGE_SHIFT : nextSeasonAge;
  if (curveAge < RETIREMENT_MIN_AGE) return 0;
  return OUTFIELD_BASE[Math.min(37, curveAge)] ?? 0;
}

function playerCa(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

/** Best CA the player has had: tracked peak, else growth snapshots, else today. */
export function peakCa(player: Player): number {
  let peak = Math.max(player.state.peak_ca ?? 0, playerCa(player));
  for (const snapshot of player.history.growth) {
    peak = Math.max(peak, estimateCa(snapshot.attributes_snapshot, player.position));
  }
  return peak;
}

/** Keep `state.peak_ca` current; runs at season end for every player. */
export function withPeakCa(player: Player): Player {
  const peak = Math.round(peakCa(player) * 10) / 10;
  if (player.state.peak_ca === peak) return player;
  return { ...player, state: { ...player.state, peak_ca: peak } };
}

/**
 * Base chance times modifiers: decline against peak, few appearances, severe
 * injuries, and the contract situation for next season.
 */
export function retirementChance(player: Player, ctx: Pick<RetirementContext, "endingSeason">): number {
  const nextSeasonAge = player.age + 1;
  const base = baseRetirementChance(nextSeasonAge, player.position === "GK");
  if (base >= 1 || base <= 0) return base;

  let factor = 1;
  const peak = peakCa(player);
  const decline = peak > 0 ? playerCa(player) / peak : 1;
  if (decline < 0.8) factor *= 2;
  else if (decline < 0.9) factor *= 1.5;

  const apps = player.state.season_apps;
  if (apps < 5) factor *= 1.5;
  else if (apps >= 25) factor *= 0.85;

  if ((player.state.severe_injuries_logged ?? 0) >= 2) factor *= 1.3;

  const until = player.contract?.until_season ?? 0;
  if (until <= ctx.endingSeason) factor *= 1.4;
  else if (until > ctx.endingSeason + 1) factor *= 0.75;

  return Math.min(MAX_SOFT_CHANCE, base * factor);
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

/** Seeded uniform in [0, 1) for one player and season; same seed, same retirements. */
export function retirementRoll(player: Player, ctx: RetirementContext): number {
  return hashString(`${ctx.masterSeed}:retire:${ctx.endingSeason}:${player.id}`) / 4294967296;
}

export function rollsRetirement(player: Player, ctx: RetirementContext): boolean {
  const chance = retirementChance(player, ctx);
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return retirementRoll(player, ctx) < chance;
}
