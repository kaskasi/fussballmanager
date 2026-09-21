import type {
  MatchState,
  PitchPosition,
  PlayerMatchStatus,
  TeamId,
  TeamTactics,
} from "@fussballmanager/shared";
import { attackingSign, distance, goalMouth, onPitchFor } from "./helpers.ts";
import { depthFromOwnGoal } from "./shape.ts";

const PRESS_RADIUS = 16;

export function localPressCount(
  defenders: readonly PlayerMatchStatus[],
  ball: PitchPosition,
): number {
  return defenders.filter(
    (player) =>
      player.role !== "GK" && distance(player.position, ball) <= PRESS_RADIUS,
  ).length;
}

export function highLineCount(
  defenders: readonly PlayerMatchStatus[],
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  minDepth = 55,
): number {
  return defenders.filter(
    (player) =>
      player.role !== "GK" &&
      depthFromOwnGoal(player.position, ownGoal, attackSign) >= minDepth,
  ).length;
}

/** Outfield teammates between the ball and their own goal. */
export function restCoverCount(
  defenders: readonly PlayerMatchStatus[],
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
): number {
  const ballDepth = depthFromOwnGoal(ball, ownGoal, attackSign);
  return defenders.filter((player) => {
    if (player.role === "GK") {
      return false;
    }
    return depthFromOwnGoal(player.position, ownGoal, attackSign) < ballDepth - 2;
  }).length;
}

export function effectivePressing(
  tactics: TeamTactics,
  localCount: number,
  highCount = 0,
): number {
  const swarm = Math.min(localCount, 6) / 3;
  const wave = Math.min(highCount, 6) / 5;
  const pack = 0.28 + 0.5 * Math.min(swarm, 1.4) + 0.45 * wave;
  return tactics.pressing * (tactics.intensity / 100) * pack;
}

export function defendingPressure(state: MatchState, defendId: TeamId): {
  localCount: number;
  highCount: number;
  restCovers: number;
  pressing: number;
} {
  const attackId =
    defendId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const defenders = onPitchFor(state.players, defendId);
  const tactics =
    defendId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const ownGoal = goalMouth(state.homeTeamId, attackId);
  const sign = attackingSign(state.homeTeamId, defendId);
  const localCount = localPressCount(defenders, state.ball);
  const highCount = highLineCount(defenders, ownGoal, sign);
  return {
    localCount,
    highCount,
    restCovers: restCoverCount(defenders, state.ball, ownGoal, sign),
    pressing: effectivePressing(tactics, localCount, highCount),
  };
}

export function isolationFactor(restCovers: number): number {
  if (restCovers <= 1) {
    return 1.55;
  }
  if (restCovers <= 2) {
    return 1.32;
  }
  if (restCovers <= 3) {
    return 1.12;
  }
  return 1;
}

