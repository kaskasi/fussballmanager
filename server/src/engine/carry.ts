import type {
  MatchEvent,
  MatchState,
  PitchPosition,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange } from "@fussballmanager/shared";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  attackingSign,
  clamp,
  clampPitch,
  distance,
  goalMouth,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";
import { outOfPlayRestart } from "./laws.ts";
import { pointToSegmentDistance } from "./lanes.ts";
import { wideDutyFor } from "./shape.ts";

/** Pace adds a little length; dribbling is the main carry skill. */
export function carryLengthMax(dribbling: number, pace: number): number {
  return 5 + (dribbling / 100) * 4 + (pace / 100) * 1.6;
}

/** Peak at 18 m: one burst should reach the box, not stop on the D. */
export function carryDrive(distanceToGoal: number): number {
  if (distanceToGoal <= 12 || distanceToGoal >= 24) {
    return 0;
  }
  return clamp(1 - Math.abs(distanceToGoal - 18) / 8, 0, 1);
}

export function carryStepLength(
  base: number,
  tempo: number,
  mentality: number,
  distanceToGoal: number,
): number {
  const drive = carryDrive(distanceToGoal);
  const tempoMentality =
    0.7 + 0.3 * (tempo / 100) + 0.15 * (mentality / 100);
  return base * tempoMentality * (1 + 0.4 * drive) + 3.4 * drive;
}

/** A defender this close to the carry line stands in the way. */
export const CARRY_BLOCK_RADIUS = 4;

/**
 * A carry runs until the first opponent standing in its path, not through him:
 * getting past a defender is a dribble duel, not a free carry (ADR 0003).
 */
export function stopShortOfBlocker(
  state: MatchState,
  carrierTeamId: MatchState["homeTeamId"],
  from: PitchPosition,
  to: PitchPosition,
): PitchPosition {
  const length = distance(from, to);
  if (length < 0.5) {
    return to;
  }
  let first = 1;
  for (const player of state.players) {
    if (!player.onPitch || player.sentOff || player.teamId === carrierTeamId) {
      continue;
    }
    const { distance: off, t } = pointToSegmentDistance(player.position, from, to);
    if (t > 0 && off <= CARRY_BLOCK_RADIUS && t < first) {
      first = t;
    }
  }
  if (first >= 1) {
    return to;
  }
  const reach = Math.max(1, first * length - 2);
  const k = Math.min(1, reach / length);
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

export function stepCarry(state: MatchState): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot carry without possession and a ball carrier");
  }
  const carrier = requirePlayer(state.players, state.ballCarrierId);
  const tactics =
    carrier.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const length = nextRange(
    state.rng,
    3,
    carryLengthMax(carrier.attributes.dribbling, carrier.attributes.pace),
  );
  const drift = nextRange(length.rng, -1, 1);
  const duration = nextRange(drift.rng, 2, 4);
  const from = carrier.position;
  const sign = attackingSign(state.homeTeamId, carrier.teamId);
  const mouth = goalMouth(state.homeTeamId, carrier.teamId);
  const distGoal = distance(from, mouth);
  const drive = carryDrive(distGoal);
  const depth = carrier.teamId === state.homeTeamId ? from.x : 100 - from.x;
  const cutsInside =
    (carrier.role === "W" && wideDutyFor(carrier, tactics) === "invert") ||
    carrier.role === "AM";
  // Inverted wingers and tens cut inside from the final third (wide wingers stay wide to cross).
  const towardBox = Math.max(
    clamp((26 - distGoal) / 14, 0, 1),
    cutsInside && depth > 62 ? 0.7 : 0,
  );
  const step = carryStepLength(
    length.n,
    tactics.tempo,
    tactics.mentality,
    distGoal,
  );
  const nearTouch = from.y < 22 || from.y > 78;
  const yShift =
    drift.n *
      (nearTouch ? 20 : 9) *
      (0.65 + tactics.width / 180) *
      (1 - 0.75 * towardBox) +
    (50 - from.y) * (0.45 * towardBox + 0.2 * drive);
  const free = {
    x: from.x + sign * step,
    y: from.y + yShift,
  };
  const raw = stopShortOfBlocker(state, carrier.teamId, from, free);
  const out = outOfPlayRestart(
    raw,
    carrier.teamId,
    state.homeTeamId,
    state.awayTeamId,
  );
  const to = clampPitch(raw);
  const timed = withTime(state, duration.n, duration.rng);
  const clock = timed.clock;
  const player = { ...asInvolved(carrier), position: to };

  const event: MatchEvent = {
    type: "carry",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: out ? out.spot : to,
    involved: [player],
    possessionTeamId: out ? out.takingTeamId : carrier.teamId,
    player,
    from,
    to: out ? out.spot : to,
  };

  return {
    event,
    state: {
      ...timed,
      ball: out ? out.spot : to,
      ballCarrierId: out ? null : carrier.playerId,
      possessionTeamId: out ? out.takingTeamId : carrier.teamId,
      ballInAir: false,
      players: patchPlayers(timed.players, [
        { playerId: carrier.playerId, position: to },
      ]),
      pending: out
        ? { type: "restart", phase: out.phase, takingTeamId: out.takingTeamId }
        : timed.pending,
      phase: out ? out.phase : timed.phase,
      nextSeq: timed.nextSeq + 1,
    },
  };
}


