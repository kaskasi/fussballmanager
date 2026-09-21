import type {
  MatchEvent,
  MatchState,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange } from "@fussballmanager/shared";
import { advanceClock } from "./clock.ts";
import {
  asInvolved,
  attackingSign,
  clampPitch,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";

export function stepCarry(state: MatchState): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot carry without possession and a ball carrier");
  }
  const carrier = requirePlayer(state.players, state.ballCarrierId);
  const tactics =
    carrier.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const length = nextRange(state.rng, 3, 5 + (carrier.attributes.pace / 100) * 8);
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
  const clock = advanceClock(state.clock, duration.n);
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
      ...state,
      clock,
      ball: to,
      ballCarrierId: carrier.playerId,
      possessionTeamId: carrier.teamId,
      players: patchPlayers(state.players, [
        { playerId: carrier.playerId, position: to },
      ]),
      rng: duration.rng,
      nextSeq: state.nextSeq + 1,
    },
  };
}


