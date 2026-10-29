import type { Player } from "../types/player.ts";
import { RETIREMENT_HARD_STOP_AGE, rollsRetirement } from "./retirement.ts";

/**
 * PRD 31 §9 — own players announce retirement in spring; the manager accepts or
 * tries once to persuade them with a one-year contract. Retirement runs at season end.
 */

/** Spring week (league matchday) the announcements arrive. */
export const RETIREMENT_ANNOUNCE_WEEK = 28;
const PERSUADE_BASE = 0.3;
const PERSUADE_MIN = 0.05;
const PERSUADE_MAX = 0.85;

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

function canRetire(player: Player, clubId: string): boolean {
  return player.club_id === clubId && (player.squad_status === "pro" || player.squad_status === "loaned_out");
}

/** Players whose season roll says "retires" get an announcement (once per season). */
export function announceOwnRetirements(
  players: readonly Player[],
  clubId: string,
  season: number,
  masterSeed: number,
): { players: Player[]; announcedIds: string[] } {
  const announcedIds: string[] = [];
  const next = players.map((player) => {
    if (!canRetire(player, clubId) || player.state.retirement?.season === season) return player;
    if (!rollsRetirement(player, { endingSeason: season, masterSeed })) return player;
    announcedIds.push(player.id);
    return { ...player, state: { ...player.state, retirement: { season, status: "announced" as const } } };
  });
  return { players: next, announcedIds };
}

/**
 * Persuade chance: morale, playing time and age. Players at the hard-stop age
 * cannot be talked round.
 */
export function persuadeChance(player: Player, matchdaysPlayed: number): number {
  if (player.age + 1 >= RETIREMENT_HARD_STOP_AGE) return 0;
  let chance = PERSUADE_BASE + (player.state.morale - 50) / 100;
  const share = matchdaysPlayed > 0 ? player.state.season_apps / matchdaysPlayed : 0;
  if (share >= 0.5) chance += 0.2;
  else if (share < 0.2) chance -= 0.1;
  if (player.age + 1 >= 37) chance -= 0.15;
  return Math.min(PERSUADE_MAX, Math.max(PERSUADE_MIN, chance));
}

export function persuadeSucceeds(player: Player, season: number, masterSeed: number, matchdaysPlayed: number): boolean {
  const roll = hashString(`${masterSeed}:persuade:${season}:${player.id}`) / 4294967296;
  return roll < persuadeChance(player, matchdaysPlayed);
}

export type RetirementAnswer = "accept" | "persuade";

/** Apply the manager's answer. A failed persuade is final; success adds a year to the contract. */
export function answerRetirement(
  player: Player,
  answer: RetirementAnswer,
  season: number,
  masterSeed: number,
  matchdaysPlayed: number,
): { player: Player; outcome: "retiring" | "staying" } {
  const staying = answer === "persuade" && persuadeSucceeds(player, season, masterSeed, matchdaysPlayed);
  const status = staying ? ("staying" as const) : ("retiring" as const);
  const contract =
    staying && player.contract && player.contract.until_season <= season
      ? { ...player.contract, until_season: season + 1 }
      : player.contract;
  return {
    player: { ...player, contract, state: { ...player.state, retirement: { season, status } } },
    outcome: status,
  };
}

/** Announced and not talked round: leaves at the end of `endingSeason`. */
export function retiresAtSeasonEnd(player: Player, endingSeason: number): boolean {
  const plan = player.state.retirement;
  return plan?.season === endingSeason && plan.status !== "staying";
}

/** Drop mentor links that point at players who left. */
export function clearMentorshipsTo(players: readonly Player[], leftIds: ReadonlySet<string>): Player[] {
  if (leftIds.size === 0) return [...players];
  return players.map((player) => {
    const link = player.state.mentorship;
    if (!link || !leftIds.has(link.mentor_player_id)) return player;
    const { mentorship: _dropped, ...state } = player.state;
    return { ...player, state };
  });
}
