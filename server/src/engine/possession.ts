import type {
  MatchEvent,
  MatchState,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange, nextUnit, pickWeighted } from "@fussballmanager/shared";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  clampPitch,
  distance,
  lerp,
  nearest,
  onPitchFor,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";
import { bestLaneCover, interceptChance } from "./lanes.ts";
import { defendingPressure } from "./pressure.ts";
import { beginTransition, inLostBall } from "./moments.ts";
import { passCompleteChance } from "./weights.ts";

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
  const picked = pickWeighted(
    state.rng,
    pool.map((player) => ({
      item: player,
      weight: 1 / (1 + distance(passer.position, player.position) / 8),
    })),
  );
  return { target: picked.item, rng: picked.rng };
}

export function stepPass(state: MatchState): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot pass without possession and a ball carrier");
  }
  const passer = requirePlayer(state.players, state.ballCarrierId);
  const { target, rng } = pickTeammate(state, passer);
  const defendId =
    passer.teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const defendTactics =
    defendId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const defenders = onPitchFor(state.players, defendId);
  const laneCover = bestLaneCover(defenders, passer.position, target.position);
  const manShadow =
    defendTactics.marking === "man"
      ? defenders.find(
          (player) =>
            player.role !== "GK" &&
            distance(player.position, target.position) < 5.5,
        )
      : undefined;
  const coverer =
    defendTactics.marking === "zonal" ? laneCover : (manShadow ?? laneCover);
  const pressure = defendingPressure(state, defendId);
  const quality = nextUnit(rng);
  const intercept = nextUnit(quality.rng);
  const intercepted =
    !!coverer &&
    intercept.n <
      interceptChance(
        coverer,
        pressure.pressing,
        inLostBall(state, defendId),
      );
  const complete =
    !intercepted &&
    quality.n <
      passCompleteChance({
        passing: passer.attributes.passing,
        form: passer.form,
        fatigue: passer.fatigue,
        pressing: pressure.pressing,
      });
  const duration = nextRange(intercept.rng, 2, 6);
  const timed = withTime(state, duration.n, duration.rng);
  const passerPos = clampPitch(lerp(passer.position, target.position, 0.12));
  const receiverPos = complete
    ? target.position
    : clampPitch(lerp(passer.position, target.position, 0.45));
  const from = { ...asInvolved(passer), position: passerPos };
  const to = {
    ...asInvolved(target),
    position: complete ? target.position : receiverPos,
  };

  if (intercepted && coverer) {
    const ball = clampPitch(coverer.position);
    const interceptor = asInvolved(coverer);
    const event: MatchEvent = {
      type: "turnover",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock: timed.clock,
      ball,
      involved: [from, to, interceptor],
      possessionTeamId: coverer.teamId,
      fromTeamId: passer.teamId,
      toTeamId: coverer.teamId,
      reason: "interception",
    };
    return {
      event,
      state: beginTransition(
        {
          ...timed,
          phase: "open_play",
          ball,
          ballCarrierId: coverer.playerId,
          possessionTeamId: coverer.teamId,
          lastPasserId: null,
          players: patchPlayers(timed.players, [
            { playerId: passer.playerId, position: passerPos },
            { playerId: target.playerId, position: to.position },
            { playerId: coverer.playerId, position: ball },
          ]),
          nextSeq: timed.nextSeq + 1,
        },
        coverer.teamId,
      ),
    };
  }

  const ball = clampPitch(
    complete ? target.position : lerp(passerPos, target.position, 0.6),
  );
  const event: MatchEvent = {
    type: "pass",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock: timed.clock,
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
      ...timed,
      phase: "open_play",
      ball,
      ballCarrierId: complete ? target.playerId : null,
      possessionTeamId: passer.teamId,
      lastPasserId: complete ? passer.playerId : null,
      players: patchPlayers(timed.players, [
        { playerId: passer.playerId, position: passerPos },
        ...(complete
          ? []
          : [{ playerId: target.playerId, position: receiverPos }]),
      ]),
      nextSeq: timed.nextSeq + 1,
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
  const timed = withTime(state, duration.n, duration.rng);
  const clock = timed.clock;
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
    state: beginTransition(
      {
        ...timed,
        ball,
        ballCarrierId: winner.playerId,
        possessionTeamId: toTeamId,
        lastPasserId: null,
        players: patchPlayers(timed.players, [
          { playerId: winner.playerId, position: ball },
        ]),
        nextSeq: timed.nextSeq + 1,
      },
      toTeamId,
    ),
  };
}
