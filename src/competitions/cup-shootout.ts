/**
 * PRD 36 slice 2 — the manager's penalty shootout, kick by kick, at wrapper
 * level (the engine has two halves only). Five kicks each, then sudden death;
 * takers in order, goalkeeper last, then the order repeats.
 */
import { cupRoll as seededRoll } from "./cup-roll.ts";

export interface ShootoutTaker {
  id: string;
  name: string;
}

export interface ShootoutKick {
  side: "home" | "away";
  takerId: string;
  taker: string;
  scored: boolean;
}

export interface Shootout {
  kicks: ShootoutKick[];
  /** `[home, away]`, never level. */
  score: [number, number];
}

const BEST_OF = 5;
const SCORE_CHANCE = 0.76;
const MAX_SUDDEN_DEATH = 40;

function takerAt(takers: readonly ShootoutTaker[], index: number, side: "home" | "away"): ShootoutTaker {
  return takers[index % Math.max(1, takers.length)] ?? { id: `${side}_${index}`, name: "—" };
}

export function cupShootout(
  seed: number,
  homeTakers: readonly ShootoutTaker[],
  awayTakers: readonly ShootoutTaker[],
): Shootout {
  const kicks: ShootoutKick[] = [];
  const score: [number, number] = [0, 0];
  const kick = (round: number, side: "home" | "away") => {
    const taker = takerAt(side === "home" ? homeTakers : awayTakers, round, side);
    const scored = seededRoll(seed, 700 + round * 2 + (side === "home" ? 0 : 1)) < SCORE_CHANCE;
    if (scored) score[side === "home" ? 0 : 1] += 1;
    kicks.push({ side, takerId: taker.id, taker: taker.name, scored });
  };
  for (let round = 0; round < BEST_OF; round++) {
    kick(round, "home");
    // Decided early: the trailing side cannot catch up with its kicks left.
    if (score[0] > score[1] + (BEST_OF - round) || score[1] > score[0] + (BEST_OF - round - 1)) break;
    kick(round, "away");
    const left = BEST_OF - round - 1;
    if (score[0] > score[1] + left || score[1] > score[0] + left) break;
  }
  for (let round = BEST_OF; score[0] === score[1] && round < BEST_OF + MAX_SUDDEN_DEATH; round++) {
    kick(round, "home");
    kick(round, "away");
  }
  // Forty level sudden-death rounds are practically impossible; the home side takes it.
  if (score[0] === score[1]) score[0] += 1;
  return { kicks, score };
}

/** Starters first (goalkeeper last), as the order of takers. */
export function shootoutTakers(
  roster: readonly { id: string; teamId: string; name: string; role: string; starter: boolean }[],
  teamId: string,
): ShootoutTaker[] {
  const team = roster.filter((player) => player.teamId === teamId && player.starter);
  const outfield = team.filter((player) => player.role !== "GK");
  const keepers = team.filter((player) => player.role === "GK");
  return [...outfield, ...keepers].map((player) => ({ id: player.id, name: player.name }));
}
