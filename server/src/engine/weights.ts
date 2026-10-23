import type { PlayerMatchStatus, TeamTactics } from "@fussballmanager/shared";
import { clamp } from "./helpers.ts";
import { MATCH_REFERENCE_SKILL } from "./normalize-attributes.ts";
import { isolationFactor } from "./pressure.ts";
import { cmDutyFor, fullbackDutyFor } from "./shape.ts";

/** 0–1.2: who is allowed to dribble. CBs almost never; overlap FBs often. */
export function carryPermission(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
  distanceToGoal: number,
): number {
  switch (player.role) {
    case "GK":
      return 0.04;
    case "CB":
      return distanceToGoal > 55 ? 0.18 : 0.08;
    case "FB":
      return fullbackDutyFor(player, tactics) === "overlap" ? 1.18 : 0.42;
    case "DM":
      return 0.38;
    case "CM":
      return cmDutyFor(player, tactics) === "playmaker" ? 0.42 : 1.05;
    case "AM":
      return 1.05;
    case "W":
      return 1.08;
    case "ST":
      return distanceToGoal < 22 ? 1.12 : 0.48;
    default: {
      const _never: never = player.role;
      return _never;
    }
  }
}

export type OpenPlayWeights = {
  pass: number;
  carry: number;
  duel: number;
  shot: number;
};

/**
 * Scales the urge to shoot near goal. Calibrated so shots land near 25 a match
 * once carries and loose balls are contested (ADR 0003).
 */
export const SHOT_APPETITE = 1.1;

/** Weight of a speculative strike from 16–32 out with a yard of space. */
export const LONG_SHOT_APPETITE = 0.2;

/** How much a player near goal stops looking for a teammate (1 = never passes). */
const LAYOFF_DAMP = 0.45;

/** Explicit open-play weights: tactics + attributes + form + fatigue. */
export function openPlayWeights(input: {
  distanceToDefender: number;
  distanceToGoal: number;
  pressing: number;
  tempo: number;
  mentality: number;
  passing: number;
  dribbling: number;
  pace: number;
  shooting: number;
  form: number;
  fatigue: number;
  strikerBonus: boolean;
  /** Gained-ball window: more direct, more shots. */
  transitionAttack?: boolean;
  /** Teammates of the defending side still between ball and their goal. */
  restCovers?: number;
  localPress?: number;
  /** Teammates who are actually on for a pass (not a long drop). */
  usefulOutlets?: number;
  /** Keeper is the only obstacle to goal; any shirt can take this on. */
  openKeeperLook?: boolean;
}): OpenPlayWeights {
  const proximity = clamp((16 - input.distanceToDefender) / 16, 0, 1);
  const freshness = clamp((input.form - input.fatigue) / 100, -0.25, 0.45);
  const goalThreat = clamp((28 - input.distanceToGoal) / 28, 0, 1);
  /** 12–24 m: carry toward the box instead of blasting from the D. */
  const fringe =
    input.distanceToGoal > 12 && input.distanceToGoal < 24
      ? clamp(1 - Math.abs(input.distanceToGoal - 18) / 8, 0, 1)
      : 0;
  const outlets = input.usefulOutlets;
  const stuck =
    goalThreat > 0.2 && outlets !== undefined && outlets === 0;
  const duel =
    proximity * (0.3 + 0.7 * (input.pressing / 100));
  const carry =
    (0.06 +
      0.28 * (input.dribbling / 100) +
      0.06 * (input.pace / 100) +
      0.08 * (input.mentality / 100) +
      0.08 * (input.tempo / 100) +
      freshness) *
    (1 - proximity * 0.35) *
    (1 + 0.28 * fringe) *
    (stuck ? 1.15 : 1);
  const pass =
    (0.38 +
      0.55 * (input.passing / 100) +
      0.15 * (input.tempo / 100) +
      freshness) *
    (1 - proximity * 0.15) *
    (1 - LAYOFF_DAMP * goalThreat) *
    (stuck ? 0.28 : 1) *
    (goalThreat > 0.35 && !input.openKeeperLook ? 0.8 : 1) *
    (input.openKeeperLook ? 0.42 : 1);
  const isolated = isolationFactor(input.restCovers ?? 4);
  const look = input.openKeeperLook === true;
  const shot =
    SHOT_APPETITE *
    goalThreat *
    (0.16 +
      0.55 * (input.shooting / 100) +
      0.18 * (input.mentality / 100) +
      (look || input.strikerBonus ? 0.4 : 0.12) +
      freshness) *
    (input.transitionAttack ? 1.35 : 1) *
    (1 + 0.18 * Math.max(0, isolated - 1)) *
    (1 + 0.85 * goalThreat) *
    (stuck ? 2.35 : 1) *
    (stuck || look ? 1 : 1 - 0.38 * fringe) *
    (look ? 2.15 : 1);
  // Shots from distance: real teams take ~40 % of their shots from outside the box.
  const range =
    input.distanceToGoal >= 16 && input.distanceToGoal <= 32
      ? 1 - Math.abs(input.distanceToGoal - 22) / 10
      : 0;
  const space = clamp((input.distanceToDefender - 3) / 6, 0, 1);
  const longShot =
    LONG_SHOT_APPETITE *
    Math.max(0, range) *
    space *
    clamp(0.4 + (input.shooting - MATCH_REFERENCE_SKILL) / 50, 0.1, 1.4);
  const swarm = Math.min(input.localPress ?? 1, 6) / 4;
  const carryBoost = input.transitionAttack ? 1.12 : 1;
  const passDamp = input.transitionAttack ? 0.92 : 1;
  return {
    pass: Math.max(pass * passDamp, goalThreat > 0.35 ? 0.02 : 0.05),
    carry: Math.max(carry * carryBoost, 0.04),
    duel: duel * (0.55 + 0.7 * swarm),
    shot: shot + longShot,
  };
}

/** Long goal kicks and keeper punts are won about half the time. */
const LONG_KICK_BASE = 0.5;

/** League-neutral opponent skill when a caller has no defender to compare against. */
const NEUTRAL_SKILL = 50;

/**
 * Pass success as a contest: passer skill against the defending side's reading
 * of the game, so amateur and elite leagues complete similar shares (ADR 0003).
 * Base rates by pass kind follow real football: short ~88 %, switch ~75 %,
 * through ~50 %, cross ~30 %, long goal kick ~55 %.
 */
export function passCompleteChance(input: {
  passing: number;
  form: number;
  fatigue: number;
  pressing: number;
  kind?: "short" | "switch" | "cross" | "through" | "restart";
  passerRole?: string;
  /** Pass length in pitch units. */
  distance?: number;
  /** Mean positioning of the defending outfield. */
  opponentReading?: number;
  /** Passer depth from own goal (0–100): build-up is safer than the final third. */
  passerDepth?: number;
}): number {
  const edge = clamp(
    (input.passing - (input.opponentReading ?? NEUTRAL_SKILL)) / 100,
    -0.5,
    0.5,
  );
  const freshness = ((input.form - 50) / 100) * 0.12 - (input.fatigue / 100) * 0.12;
  const press = 0.1 * (input.pressing / 100);
  const dist = input.distance ?? 14;
  const depth = input.passerDepth ?? 50;
  // Real teams: ~95 % in their own third, ~83 % in midfield, ~70 % in the final third.
  const zone = depth < 33 ? 0.07 : depth > 66 ? -0.07 : 0;
  const pressWeight = depth < 33 ? 0.4 : 1;
  if ((input.kind === "restart" || input.passerRole === "GK") && dist <= 28) {
    // Keeper or restart played short: nobody presses a set ball.
    return clamp(0.97 + 0.1 * edge - press * 0.5, 0.85, 0.99);
  }
  let base: number;
  if (input.kind === "restart" || input.passerRole === "GK") {
    base = LONG_KICK_BASE;
  } else if (input.kind === "cross") {
    base = 0.34;
  } else if (input.kind === "through") {
    base = 0.52;
  } else if (input.kind === "switch") {
    base = 0.76;
  } else {
    base = 0.93 - 0.006 * Math.max(0, dist - 12) + zone;
  }
  return clamp(base + 0.3 * edge + freshness - press * pressWeight, 0.12, 0.97);
}

export function contestStrength(input: {
  attribute: number;
  form: number;
  fatigue: number;
  tacticBonus: number;
}): number {
  return Math.max(
    1,
    input.attribute + input.form * 0.5 - input.fatigue * 0.5 + input.tacticBonus,
  );
}

/** Average adult reference. Taller than this helps headers; shorter hurts. */
const AERIAL_HEIGHT_REF_CM = 180;

/** Height is centimetres, not a 0–100 skill. ~0.75 contest points per cm. */
export function heightAerialBonus(heightCm: number): number {
  return (clamp(heightCm, 150, 215) - AERIAL_HEIGHT_REF_CM) * 0.75;
}

/** Aerial skill plus standing height. Pace is not an input. */
export function aerialContestAttribute(input: {
  aerial: number;
  heightCm: number;
}): number {
  return input.aerial + heightAerialBonus(input.heightCm);
}

export function contestWinChance(self: number, opponent: number): number {
  return self / (self + opponent);
}

export function shotOutcomeChances(input: {
  shooting: number;
  form: number;
  fatigue: number;
  mentality: number;
  distanceToGoal: number;
  keeperGoalkeeping: number;
  keeperPositioning: number;
  keeperForm: number;
  keeperFatigue: number;
  defenderClose: boolean;
  defenderTackling: number;
  /** Lost-ball rest defence is not set; shots are more likely to go in. */
  transitionAttack?: boolean;
  restCovers?: number;
  /** Penalty: no wall, keeper 1v1 from 12 yards. */
  penalty?: boolean;
}): { onTarget: number; block: number; goalGivenOnTarget: number } {
  const isolated = isolationFactor(input.restCovers ?? 4);
  const freshness = ((input.form - 50 - input.fatigue) / 100) * 0.1;
  const edge = (input.shooting - MATCH_REFERENCE_SKILL) / 100 + freshness;
  if (input.penalty) {
    return {
      onTarget: clamp(0.84 + 0.2 * edge, 0.7, 0.95),
      block: 0,
      goalGivenOnTarget: clamp(
        0.88 - 0.25 * ((input.keeperGoalkeeping - input.shooting) / 100),
        0.7,
        0.95,
      ),
    };
  }
  const d = input.distanceToGoal;
  // xG shape: distance sets the base, shooter vs keeper bends it (ADR 0003).
  // Typical open-play shot ~16 out: ~43 % on target, ~25 % blocked, ~9 % scored.
  const onTarget = clamp(
    0.62 - 0.012 * d + 0.3 * edge + 0.05 * ((input.mentality - 50) / 100),
    0.18,
    0.85,
  );
  const block = input.defenderClose
    ? clamp(
        ((0.3 + 0.2 * ((input.defenderTackling - MATCH_REFERENCE_SKILL) / 100)) *
          (input.transitionAttack ? 0.7 : 1)) /
          isolated,
        0.08,
        0.5,
      )
    : 0.06;
  const keeper =
    input.keeperGoalkeeping +
    0.2 * (input.keeperPositioning - MATCH_REFERENCE_SKILL) +
    (input.keeperForm - 50 - input.keeperFatigue) * 0.1;
  const duel = clamp(1 + 0.6 * ((input.shooting - keeper) / 100), 0.6, 1.4);
  const goalGivenOnTarget = clamp(
    0.8 *
      Math.exp(-d / 13) *
      duel *
      (1 + 0.15 * (isolated - 1)) *
      (input.transitionAttack ? 1.06 : 1),
    0.04,
    0.8,
  );
  return { onTarget, block, goalGivenOnTarget };
}
