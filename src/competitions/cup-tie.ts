/**
 * PRD 36 §4 — one cup tie with the quick strength model (as the promotion
 * playoffs), and a seeded penalty shootout when it is level after 90 minutes.
 */
import type { TeamId } from "@fussballmanager/shared";
import { seededRoll } from "../sim/division-matchday.ts";

export interface CupTieResult {
  homeGoals: number;
  awayGoals: number;
  /** `[home, away]`, only when level after 90 minutes. */
  penalties?: [number, number];
  winner: TeamId;
}

/** Strength of a club on the quick-sim scale (`squadAverageStrength`). */
export type StrengthOf = (teamId: TeamId) => number;

function goals(base: number, edge: number, roll: number, spread: number): number {
  return Math.min(5, Math.max(0, Math.round(base + edge + roll * spread)));
}

/** Five kicks each, then sudden death; never level. */
export function penaltyShootout(seed: number): [number, number] {
  let home = 0;
  let away = 0;
  for (let kick = 0; kick < 5; kick++) {
    if (seededRoll(seed, 200 + kick * 2) < 0.76) home += 1;
    if (seededRoll(seed, 201 + kick * 2) < 0.76) away += 1;
  }
  for (let kick = 0; home === away && kick < 30; kick++) {
    const homeScores = seededRoll(seed, 300 + kick * 2) < 0.72;
    const awayScores = seededRoll(seed, 301 + kick * 2) < 0.72;
    if (homeScores) home += 1;
    if (awayScores) away += 1;
  }
  // 30 level sudden-death rounds are practically impossible; the home side takes it.
  if (home === away) home += 1;
  return [home, away];
}

export function simulateCupTie(
  home: TeamId,
  away: TeamId,
  seed: number,
  strengthOf: StrengthOf,
  neutral = false,
): CupTieResult {
  const edge = (strengthOf(home) - strengthOf(away)) / 18;
  // A neutral final has no home advantage: both sides use the same base.
  const homeBase = neutral ? 1.05 : 1.2;
  const awayBase = neutral ? 1.05 : 0.9;
  const homeGoals = goals(homeBase, edge, seededRoll(seed, 91), 2);
  const awayGoals = goals(awayBase, neutral ? -edge : -edge * 0.5, seededRoll(seed, 93), 2);
  if (homeGoals !== awayGoals) {
    return { homeGoals, awayGoals, winner: homeGoals > awayGoals ? home : away };
  }
  const penalties = penaltyShootout(seed);
  return { homeGoals, awayGoals, penalties, winner: penalties[0] > penalties[1] ? home : away };
}
