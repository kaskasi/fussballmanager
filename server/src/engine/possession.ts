import type {
  MatchEvent,
  MatchState,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextInt, nextRange, nextUnit } from "@fussballmanager/shared";
import { advanceClock } from "./clock.ts";
import {
  asInvolved,
  clamp,
  clampPitch,
  lerp,
  movePlayer,
  nearest,
  onPitchFor,
  requirePlayer,
} from "./helpers.ts";

function oppositionPressing(state: MatchState, teamId: string): number {
  return teamId === state.homeTeamId
    ? state.awayTactics.pressing
    : state.homeTactics.pressing;
}

function passCompleteChance(
  passer: PlayerMatchStatus,
  pressing: number,
): number {
  const quality =
    (passer.attributes.passing + passer.form - passer.fatigue) / 100;
  return clamp(0.5 + 0.4 * quality - 0.25 * (pressing / 100), 0.2, 0.92);
}

function pickTeammate(
  state: MatchState,
  passer: PlayerMatchStatus,
): { target: PlayerMatchStatus; rng: MatchState["rng"] } {
  const teammates = onPitchFor(state.players, passer.teamId).filter(
    (player) => player.playerId !== passer.playerId,
  );
  const outfield = teammates.filter((player) => player.role !== "GK");
  const pool = outfield.length > 0 ? outfield : teammates;
  if (pool.length === 0) {
    throw new Error("No pass target on the pitch");
  }
  const picked = nextInt(state.rng, pool.length);
  const target = pool[picked.i];
  if (!target) {
    throw new Error("Pass target index out of range");
  }
  return { target, rng: picked.rng };
}

export function stepPass(state: MatchState): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot pass without possession and a ball carrier");
  }
  const passer = requirePlayer(state.players, state.ballCarrierId);
  const { target, rng } = pickTeammate(state, passer);
  const roll = nextUnit(rng);
  const complete =
    roll.n < passCompleteChance(passer, oppositionPressing(state, passer.teamId));
  const duration = nextRange(roll.rng, 2, 6);
  const clock = advanceClock(state.clock, duration.n);
  const ball = clampPitch(
    complete
      ? target.position
      : lerp(passer.position, target.position, 0.6),
  );
  const from = asInvolved(passer);
  const to = asInvolved(target);

  const event: MatchEvent = {
    type: "pass",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball,
    involved: [from, to],
    possessionTeamId: passer.teamId,
    from,
    to,
    complete,
  };

  return {
    event,
    state: {
      ...state,
      clock,
      phase: "open_play",
      ball,
      ballCarrierId: complete ? target.playerId : null,
      possessionTeamId: passer.teamId,
      rng: duration.rng,
      nextSeq: state.nextSeq + 1,
    },
  };
}

export function stepTurnover(state: MatchState): StepResult {
  if (!state.possessionTeamId) {
    throw new Error("Cannot turn over without a possessing team");
  }
  const fromTeamId = state.possessionTeamId;
  const toTeamId =
    fromTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const winner = nearest(onPitchFor(state.players, toTeamId), state.ball);
  if (!winner) {
    throw new Error("No opponent available for turnover");
  }
  const duration = nextRange(state.rng, 1, 3);
  const clock = advanceClock(state.clock, duration.n);
  const ball = winner.position;
  const involved = [asInvolved(winner)];

  const event: MatchEvent = {
    type: "turnover",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball,
    involved,
    possessionTeamId: toTeamId,
    fromTeamId,
    toTeamId,
    reason: state.ballCarrierId ? "interception" : "error",
  };

  return {
    event,
    state: {
      ...state,
      clock,
      ball,
      ballCarrierId: winner.playerId,
      possessionTeamId: toTeamId,
      players: movePlayer(state.players, winner.playerId, ball),
      rng: duration.rng,
      nextSeq: state.nextSeq + 1,
    },
  };
}
