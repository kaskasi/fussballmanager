import type {
  PitchPosition,
  PlayerMatchStatus,
  RestartPhase,
  TeamId,
} from "@fussballmanager/shared";
import { PITCH_MAX, PITCH_MIN } from "@fussballmanager/shared";
import { attackingSign, clamp, oppositionTeamId } from "./helpers.ts";
import { depthFromOwnGoal, offsideLineDepth } from "./shape.ts";

const BOX_Y_MIN = 21;
const BOX_Y_MAX = 79;
const BOX_DEPTH = 16.5;

export function inPenaltyArea(
  position: PitchPosition,
  defendingTeamId: TeamId,
  homeTeamId: TeamId,
): boolean {
  if (position.y < BOX_Y_MIN || position.y > BOX_Y_MAX) {
    return false;
  }
  if (defendingTeamId === homeTeamId) {
    return position.x <= BOX_DEPTH;
  }
  return position.x >= PITCH_MAX - BOX_DEPTH;
}

export function foulRestartPhase(
  fouledPosition: PitchPosition,
  foulerTeamId: TeamId,
  homeTeamId: TeamId,
): Extract<RestartPhase, "penalty" | "free_kick"> {
  return inPenaltyArea(fouledPosition, foulerTeamId, homeTeamId)
    ? "penalty"
    : "free_kick";
}

export function penaltySpot(
  attackingTeamId: TeamId,
  homeTeamId: TeamId,
): PitchPosition {
  return attackingTeamId === homeTeamId
    ? { x: PITCH_MAX - 11.5, y: 50 }
    : { x: 11.5, y: 50 };
}

export function throwInSpot(raw: PitchPosition): PitchPosition {
  return {
    x: clamp(raw.x, 1, 99),
    y: raw.y < 50 ? PITCH_MIN : PITCH_MAX,
  };
}

/**
 * Offside at the pass: receiver in the opponents' half, ahead of the ball,
 * and ahead of the second-last opponent (including the keeper).
 */
export function isOffsideReceiver(input: {
  receiver: PitchPosition;
  ball: PitchPosition;
  defenders: readonly PlayerMatchStatus[];
  attackingTeamId: TeamId;
  homeTeamId: TeamId;
}): boolean {
  const sign = attackingSign(input.homeTeamId, input.attackingTeamId);
  const attackOwnGoal =
    input.attackingTeamId === input.homeTeamId
      ? { x: PITCH_MIN, y: 50 }
      : { x: PITCH_MAX, y: 50 };
  const recv = depthFromOwnGoal(input.receiver, attackOwnGoal, sign);
  const ball = depthFromOwnGoal(input.ball, attackOwnGoal, sign);
  if (recv <= 50) {
    return false;
  }
  if (recv <= ball + 1.2) {
    return false;
  }
  const secondLast = offsideLineDepth(input.defenders, attackOwnGoal, sign);
  return recv > secondLast + 1.2;
}

export type OutOfPlay = {
  phase: Extract<RestartPhase, "throw_in" | "goal_kick" | "corner">;
  takingTeamId: TeamId;
  spot: PitchPosition;
};

export function outOfPlayRestart(
  raw: PitchPosition,
  lastTouchTeamId: TeamId,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
): OutOfPlay | null {
  const xOut = raw.x < PITCH_MIN || raw.x > PITCH_MAX;
  const yOut = raw.y < PITCH_MIN || raw.y > PITCH_MAX;
  if (!xOut && !yOut) {
    return null;
  }
  if (xOut) {
    const defendingId = raw.x < PITCH_MIN ? homeTeamId : awayTeamId;
    const attackingId = oppositionTeamId(homeTeamId, defendingId, awayTeamId);
    if (lastTouchTeamId === defendingId) {
      return {
        phase: "corner",
        takingTeamId: attackingId,
        spot: {
          x: defendingId === homeTeamId ? 2 : 98,
          y: raw.y < 50 ? 4 : 96,
        },
      };
    }
    return {
      phase: "goal_kick",
      takingTeamId: defendingId,
      spot:
        defendingId === homeTeamId ? { x: 6, y: 50 } : { x: 94, y: 50 },
    };
  }
  return {
    phase: "throw_in",
    takingTeamId: oppositionTeamId(homeTeamId, lastTouchTeamId, awayTeamId),
    spot: throwInSpot(raw),
  };
}