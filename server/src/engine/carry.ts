import type {
  MatchEvent,
  MatchState,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange } from "@fussballmanager/shared";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  attackingSign,
  clampPitch,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";

/** Pace adds a little length; dribbling is the main carry skill. */
export function carryLengthMax(dribbling: number, pace: number): number {
  return 5 + (dribbling / 100) * 4 + (pace / 100) * 1.6;
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
  const duration = nextRange(drift.rng, 1, 4);
  const from = carrier.position;
  const sign = attackingSign(state.homeTeamId, carrier.teamId);
  const distance =
    length.n * (0.7 + 0.3 * (tactics.tempo / 100) + 0.15 * (tactics.mentality / 100));
  const yShift = drift.n * 4 * (tactics.width / 100);
  const to = clampPitch({
    x: from.x + sign * distance,
    y: from.y + yShift,
  });
  const timed = withTime(state, duration.n, duration.rng);
  const clock = timed.clock;
  const player = { ...asInvolved(carrier), position: to };

  const event: MatchEvent = {
    type: "carry",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: to,
    involved: [player],
    possessionTeamId: carrier.teamId,
    player,
    from,
    to,
  };

  return {
    event,
    state: {
      ...timed,
      ball: to,
      ballCarrierId: carrier.playerId,
      possessionTeamId: carrier.teamId,
      players: patchPlayers(timed.players, [
        { playerId: carrier.playerId, position: to },
      ]),
      nextSeq: timed.nextSeq + 1,
    },
  };
}


