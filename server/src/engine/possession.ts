import type {
  MatchEvent,
  MatchState,
  PassKind,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange, nextUnit } from "@fussballmanager/shared";
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
import { pickPassTarget } from "./pass-graph.ts";
import { defendingPressure } from "./pressure.ts";
import { beginTransition, inLostBall } from "./moments.ts";
import { passCompleteChance } from "./weights.ts";
import { isOffsideReceiver, outOfPlayRestart } from "./laws.ts";

export { widePassFeedWeight } from "./pass-graph.ts";

export function stepPass(
  state: MatchState,
  kind?: PassKind,
): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot pass without possession and a ball carrier");
  }
  const passer = requirePlayer(state.players, state.ballCarrierId);
  const picked = pickPassTarget(state, passer, kind);
  const target = picked.target;
  const passKind = picked.kind;
  const dest = picked.spot;
  const rng = picked.rng;
  const defendId =
    passer.teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const defendTactics =
    defendId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const defenders = onPitchFor(state.players, defendId);
  const laneCover = bestLaneCover(defenders, passer.position, dest);
  const manShadow =
    defendTactics.marking === "man"
      ? defenders.find(
          (player) =>
            player.role !== "GK" &&
            distance(player.position, dest) < 5.5,
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
        kind: passKind,
        passerRole: passer.role,
      });
  const duration = nextRange(intercept.rng, 2, 6);
  const slice = nextRange(duration.rng, -34, 34);
  const timed = withTime(state, duration.n, slice.rng);
  const passerPos = clampPitch(lerp(passer.position, dest, 0.12));
  const receiverPos = complete
    ? dest
    : clampPitch(lerp(target.position, dest, 0.45));
  const from = { ...asInvolved(passer), position: passerPos };
  const to = {
    ...asInvolved(target),
    position: complete ? dest : receiverPos,
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
          ballInAir: false,
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

  if (
    complete &&
    isOffsideReceiver({
      receiver: target.position,
      ball: passer.position,
      defenders,
      attackingTeamId: passer.teamId,
      homeTeamId: state.homeTeamId,
    })
  ) {
    const ball = clampPitch(dest);
    const event: MatchEvent = {
      type: "turnover",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock: timed.clock,
      ball,
      involved: [from, to],
      possessionTeamId: defendId,
      fromTeamId: passer.teamId,
      toTeamId: defendId,
      reason: "offside",
    };
    return {
      event,
      state: {
        ...timed,
        phase: "free_kick",
        ball,
        ballCarrierId: null,
        possessionTeamId: defendId,
        lastPasserId: null,
        ballInAir: false,
        players: patchPlayers(timed.players, [
          { playerId: passer.playerId, position: passerPos },
        ]),
        pending: {
          type: "restart",
          phase: "free_kick",
          takingTeamId: defendId,
        },
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  const intended = complete
    ? dest
    : {
        x: passerPos.x + (dest.x - passerPos.x) * 0.6,
        y: passerPos.y + (dest.y - passerPos.y) * 0.6 + slice.n,
      };
  const out = complete
    ? null
    : outOfPlayRestart(
        intended,
        passer.teamId,
        state.homeTeamId,
        state.awayTeamId,
      );
  if (out) {
    const event: MatchEvent = {
      type: "pass",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock: timed.clock,
      ball: out.spot,
      involved: [from, to],
      possessionTeamId: out.takingTeamId,
      from,
      to,
      complete: false,
      kind: passKind,
    };
    return {
      event,
      state: {
        ...timed,
        phase: out.phase,
        ball: out.spot,
        ballCarrierId: null,
        possessionTeamId: out.takingTeamId,
        lastPasserId: null,
        ballInAir: false,
        players: patchPlayers(timed.players, [
          { playerId: passer.playerId, position: passerPos },
        ]),
        pending: {
          type: "restart",
          phase: out.phase,
          takingTeamId: out.takingTeamId,
        },
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  const ball = clampPitch(complete ? dest : lerp(passerPos, dest, 0.6));
  const air =
    passKind === "cross" ||
    passKind === "through" ||
    (passKind === "restart" && distance(passer.position, dest) > 28);
  if (!complete) {
    const loose = nearest(defenders, ball);
    if (loose) {
      const event: MatchEvent = {
        type: "pass",
        seq: timed.nextSeq,
        matchId: timed.matchId,
        clock: timed.clock,
        ball,
        involved: [from, to, asInvolved(loose)],
        possessionTeamId: loose.teamId,
        from,
        to,
        complete: false,
        kind: passKind,
      };
      return {
        event,
        state: beginTransition(
          {
            ...timed,
            phase: "open_play",
            ball,
            ballCarrierId: loose.playerId,
            possessionTeamId: loose.teamId,
            lastPasserId: null,
            ballInAir: air,
            players: patchPlayers(timed.players, [
              { playerId: passer.playerId, position: passerPos },
              { playerId: target.playerId, position: receiverPos },
              { playerId: loose.playerId, position: ball },
            ]),
            nextSeq: timed.nextSeq + 1,
          },
          loose.teamId,
        ),
      };
    }
  }
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
    kind: passKind,
  };
  return {
    event,
    state: {
      ...timed,
      phase: "open_play",
      ball,
      ballCarrierId: target.playerId,
      possessionTeamId: passer.teamId,
      lastPasserId: passer.playerId,
      ballInAir: air,
      players: patchPlayers(timed.players, [
        { playerId: passer.playerId, position: passerPos },
        { playerId: target.playerId, position: receiverPos },
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
