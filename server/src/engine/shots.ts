import type {
  MatchEvent,
  MatchState,
  PendingFollowUp,
  PlayerId,
  PlayerMatchStatus,
  ShotOutcome,
  RestartPhase,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange, nextUnit } from "@fussballmanager/shared";
import { resolveDisciplinePending } from "./discipline.ts";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  clampPitch,
  distance,
  goalMouth,
  nearest,
  onPitchFor,
  oppositionTeamId,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";
import { shotOutcomeChances } from "./weights.ts";
import { beginTransition, inGainedBall } from "./moments.ts";
import { defendingPressure } from "./pressure.ts";
import { penaltySpot, throwInSpot } from "./laws.ts";

function keeperOf(
  state: MatchState,
  teamId: MatchState["homeTeamId"],
): PlayerMatchStatus | undefined {
  return onPitchFor(state.players, teamId).find((player) => player.role === "GK");
}

function involvedAssist(
  state: MatchState,
  shooterId: PlayerId,
): ReturnType<typeof asInvolved> | undefined {
  if (!state.lastPasserId || state.lastPasserId === shooterId) {
    return undefined;
  }
  return asInvolved(requirePlayer(state.players, state.lastPasserId));
}

function resolveOutcome(
  state: MatchState,
  shooter: PlayerMatchStatus,
  keeper: PlayerMatchStatus | undefined,
  defender: PlayerMatchStatus | undefined,
): { outcome: ShotOutcome; rng: MatchState["rng"] } {
  const attackTactics =
    shooter.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const mouth = goalMouth(state.homeTeamId, shooter.teamId);
  const dist = distance(shooter.position, mouth);
  const close = defender ? distance(shooter.position, defender.position) < 8 : false;
  const defendId = oppositionTeamId(
    state.homeTeamId,
    shooter.teamId,
    state.awayTeamId,
  );
  const pressure = defendingPressure(state, defendId);
  const chances = shotOutcomeChances({
    shooting: shooter.attributes.shooting,
    form: shooter.form,
    fatigue: shooter.fatigue,
    mentality: attackTactics.mentality,
    distanceToGoal: dist,
    keeperGoalkeeping: keeper?.attributes.goalkeeping ?? 0,
    keeperPositioning: keeper?.attributes.positioning ?? 0,
    keeperForm: keeper?.form ?? 50,
    keeperFatigue: keeper?.fatigue ?? 0,
    defenderClose: close,
    defenderTackling: defender?.attributes.tackling ?? 40,
    transitionAttack: inGainedBall(state),
    restCovers: pressure.restCovers,
    penalty: state.phase === "penalty",
  });
  const onTargetRoll = nextUnit(state.rng);
  if (onTargetRoll.n >= chances.onTarget) {
    const wood = nextUnit(onTargetRoll.rng);
    return {
      outcome: wood.n < 0.12 ? "woodwork" : "wide",
      rng: wood.rng,
    };
  }
  const blockRoll = nextUnit(onTargetRoll.rng);
  if (chances.block > 0 && blockRoll.n < chances.block) {
    return { outcome: "block", rng: blockRoll.rng };
  }
  const finish = nextUnit(blockRoll.rng);
  if (!keeper) {
    return {
      outcome: finish.n < 0.94 ? "goal" : "wide",
      rng: finish.rng,
    };
  }
  return {
    outcome: finish.n < chances.goalGivenOnTarget ? "goal" : "save",
    rng: finish.rng,
  };
}

function pendingAfterShot(
  outcome: ShotOutcome,
  state: MatchState,
  shooter: PlayerMatchStatus,
  keeper: PlayerMatchStatus | undefined,
): PendingFollowUp | null {
  const defendingId = oppositionTeamId(
    state.homeTeamId,
    shooter.teamId,
    state.awayTeamId,
  );
  if (outcome === "save") {
    if (!keeper) {
      return {
        type: "goal",
        scorerId: shooter.playerId,
        ...(state.lastPasserId && state.lastPasserId !== shooter.playerId
          ? { assistId: state.lastPasserId }
          : {}),
      };
    }
    return { type: "save", keeperId: keeper.playerId, shooterId: shooter.playerId };
  }
  if (outcome === "goal") {
    return {
      type: "goal",
      scorerId: shooter.playerId,
      ...(state.lastPasserId && state.lastPasserId !== shooter.playerId
        ? { assistId: state.lastPasserId }
        : {}),
    };
  }
  if (outcome === "wide") {
    return { type: "restart", phase: "goal_kick", takingTeamId: defendingId };
  }
  if (outcome === "block") {
    return { type: "restart", phase: "corner", takingTeamId: shooter.teamId };
  }
  return null;
}

export function stepShot(state: MatchState): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot shoot without a ball carrier");
  }
  const shooter = requirePlayer(state.players, state.ballCarrierId);
  const defendingId = oppositionTeamId(
    state.homeTeamId,
    shooter.teamId,
    state.awayTeamId,
  );
  const keeper = keeperOf(state, defendingId);
  const penalty = state.phase === "penalty";
  const defender = penalty
    ? undefined
    : nearest(
        onPitchFor(state.players, defendingId).filter((p) => p.role !== "GK"),
        shooter.position,
      );
  const resolved = resolveOutcome(state, shooter, keeper, defender);
  const duration = nextRange(resolved.rng, 1, 3);
  const mouth = goalMouth(state.homeTeamId, shooter.teamId);
  const yJitter = nextRange(duration.rng, -8, 8);
  const target = clampPitch({ x: mouth.x, y: mouth.y + yJitter.n });
  const ball =
    resolved.outcome === "goal"
      ? mouth
      : resolved.outcome === "save" && keeper
        ? keeper.position
        : resolved.outcome === "block" && defender
          ? defender.position
          : resolved.outcome === "woodwork"
            ? clampPitch({ x: mouth.x, y: mouth.y + (yJitter.n < 0 ? -6 : 6) })
            : clampPitch({ x: mouth.x, y: yJitter.n < 0 ? 4 : 96 });
  const timed = withTime(state, duration.n, yJitter.rng);
  const clock = timed.clock;
  const shooterInv = asInvolved(shooter);
  const assist = involvedAssist(state, shooter.playerId);
  const involved = assist ? [shooterInv, assist] : [shooterInv];

  const event: MatchEvent = {
    type: "shot",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball,
    involved,
    possessionTeamId: shooter.teamId,
    shooter: shooterInv,
    ...(assist ? { assist } : {}),
    target,
    outcome: resolved.outcome,
  };

  return {
    event,
    state: {
      ...timed,
      ball,
      ballCarrierId:
        resolved.outcome === "save" && keeper ? keeper.playerId : null,
      possessionTeamId: shooter.teamId,
      lastPasserId: null,
      pending: pendingAfterShot(resolved.outcome, timed, shooter, keeper),
      phase:
        resolved.outcome === "goal"
          ? "goal_restart"
          : resolved.outcome === "wide"
            ? "goal_kick"
            : resolved.outcome === "block"
              ? "corner"
              : "open_play",
      nextSeq: timed.nextSeq + 1,
    },
  };
}

export function resolvePending(state: MatchState): StepResult {
  const pending = state.pending;
  if (!pending) {
    throw new Error("No pending follow-up");
  }
  if (pending.type === "save") {
    return stepSave(state, pending.keeperId, pending.shooterId);
  }
  if (pending.type === "goal") {
    return stepGoal(state, pending.scorerId, pending.assistId);
  }
  if (pending.type === "restart") {
    return stepRestart(state, pending.phase, pending.takingTeamId);
  }
  return resolveDisciplinePending(state);
}

function stepSave(
  state: MatchState,
  keeperId: PlayerId,
  shooterId: PlayerId,
): StepResult {
  const keeper = requirePlayer(state.players, keeperId);
  const shooter = requirePlayer(state.players, shooterId);
  const timed = withTime(state, 1, state.rng);
  const clock = timed.clock;
  const keeperInv = asInvolved(keeper);
  const shooterInv = asInvolved(shooter);
  const event: MatchEvent = {
    type: "save",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: keeper.position,
    involved: [keeperInv, shooterInv],
    possessionTeamId: keeper.teamId,
    keeper: keeperInv,
    shooter: shooterInv,
  };
  const saved = beginTransition(
    {
      ...timed,
      phase: "open_play",
      ball: keeper.position,
      ballCarrierId: keeper.playerId,
      possessionTeamId: keeper.teamId,
      pending: null,
      nextSeq: timed.nextSeq + 1,
    },
    keeper.teamId,
  );
  return {
    event,
    state: saved,
  };
}

function stepGoal(
  state: MatchState,
  scorerId: PlayerId,
  assistId: PlayerId | undefined,
): StepResult {
  const scorer = requirePlayer(state.players, scorerId);
  const assist = assistId
    ? asInvolved(requirePlayer(state.players, assistId))
    : undefined;
  const timed = withTime(state, 1, state.rng);
  const clock = timed.clock;
  const scorerInv = asInvolved(scorer);
  const homeScored = scorer.teamId === state.homeTeamId;
  const score = {
    home: state.score.home + (homeScored ? 1 : 0),
    away: state.score.away + (homeScored ? 0 : 1),
  };
  const conceding = oppositionTeamId(
    state.homeTeamId,
    scorer.teamId,
    state.awayTeamId,
  );
  const event: MatchEvent = {
    type: "goal",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: state.ball,
    involved: assist ? [scorerInv, assist] : [scorerInv],
    possessionTeamId: conceding,
    scorer: scorerInv,
    ...(assist ? { assist } : {}),
  };
  return {
    event,
    state: {
      ...timed,
      score,
      phase: "goal_restart",
      possessionTeamId: conceding,
      ballCarrierId: null,
      pending: { type: "restart", phase: "kickoff", takingTeamId: conceding },
      nextSeq: timed.nextSeq + 1,
    },
  };
}

export function stepRestart(
  state: MatchState,
  phase: RestartPhase,
  takingTeamId: MatchState["homeTeamId"],
): StepResult {
  const timed = withTime(state, 2, state.rng);
  const clock = timed.clock;
  if (phase === "kickoff") {
    const kicker =
      onPitchFor(timed.players, takingTeamId).find((p) => p.role === "ST") ??
      onPitchFor(timed.players, takingTeamId)[0];
    if (!kicker) {
      throw new Error("No kicker for restart kickoff");
    }
    const spot = { x: 50, y: 50 };
    const kickerInv = { ...asInvolved(kicker), position: spot };
    const event: MatchEvent = {
      type: "restart",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock,
      ball: spot,
      involved: [kickerInv],
      possessionTeamId: takingTeamId,
      phase: "kickoff",
      takingTeamId,
    };
    return {
      event,
      state: {
        ...timed,
        phase: "kickoff",
        ball: spot,
        ballCarrierId: kicker.playerId,
        possessionTeamId: takingTeamId,
        players: patchPlayers(timed.players, [
          { playerId: kicker.playerId, position: spot },
        ]),
        pending: null,
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  if (phase === "goal_kick") {
    const taker =
      keeperOf(timed, takingTeamId) ??
      onPitchFor(timed.players, takingTeamId)[0];
    if (!taker) {
      throw new Error("No taker for goal kick");
    }
    const spot =
      takingTeamId === timed.homeTeamId ? { x: 6, y: 50 } : { x: 94, y: 50 };
    const takerInv = { ...asInvolved(taker), position: spot };
    const event: MatchEvent = {
      type: "restart",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock,
      ball: spot,
      involved: [takerInv],
      possessionTeamId: takingTeamId,
      phase: "goal_kick",
      takingTeamId,
    };
    return {
      event,
      state: {
        ...timed,
        phase: "open_play",
        ball: spot,
        ballCarrierId: taker.playerId,
        possessionTeamId: takingTeamId,
        players: patchPlayers(timed.players, [
          { playerId: taker.playerId, position: spot },
        ]),
        pending: null,
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  if (phase === "free_kick") {
    const spot = timed.ball;
    const taker =
      nearest(onPitchFor(timed.players, takingTeamId), spot) ??
      onPitchFor(timed.players, takingTeamId)[0];
    if (!taker) {
      throw new Error("No free-kick taker");
    }
    const takerInv = { ...asInvolved(taker), position: spot };
    const event: MatchEvent = {
      type: "restart",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock,
      ball: spot,
      involved: [takerInv],
      possessionTeamId: takingTeamId,
      phase: "free_kick",
      takingTeamId,
    };
    return {
      event,
      state: {
        ...timed,
        phase: "open_play",
        ball: spot,
        ballCarrierId: taker.playerId,
        possessionTeamId: takingTeamId,
        players: patchPlayers(timed.players, [
          { playerId: taker.playerId, position: spot },
        ]),
        pending: null,
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  if (phase === "throw_in") {
    const spot = throwInSpot(timed.ball);
    const taker =
      nearest(onPitchFor(timed.players, takingTeamId), spot) ??
      onPitchFor(timed.players, takingTeamId)[0];
    if (!taker) {
      throw new Error("No throw-in taker");
    }
    const takerInv = { ...asInvolved(taker), position: spot };
    const event: MatchEvent = {
      type: "restart",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock,
      ball: spot,
      involved: [takerInv],
      possessionTeamId: takingTeamId,
      phase: "throw_in",
      takingTeamId,
    };
    return {
      event,
      state: {
        ...timed,
        phase: "open_play",
        ball: spot,
        ballCarrierId: taker.playerId,
        possessionTeamId: takingTeamId,
        players: patchPlayers(timed.players, [
          { playerId: taker.playerId, position: spot },
        ]),
        pending: null,
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  if (phase === "penalty") {
    const spot = penaltySpot(takingTeamId, timed.homeTeamId);
    const onPitch = onPitchFor(timed.players, takingTeamId);
    const taker =
      onPitch
        .filter((player) => player.role === "ST")
        .sort((a, b) => b.attributes.shooting - a.attributes.shooting)[0] ??
      nearest(onPitch, spot) ??
      onPitch[0];
    if (!taker) {
      throw new Error("No penalty taker");
    }
    const takerInv = { ...asInvolved(taker), position: spot };
    const event: MatchEvent = {
      type: "restart",
      seq: timed.nextSeq,
      matchId: timed.matchId,
      clock,
      ball: spot,
      involved: [takerInv],
      possessionTeamId: takingTeamId,
      phase: "penalty",
      takingTeamId,
    };
    return {
      event,
      state: {
        ...timed,
        phase: "penalty",
        ball: spot,
        ballCarrierId: taker.playerId,
        possessionTeamId: takingTeamId,
        lastPasserId: null,
        players: patchPlayers(timed.players, [
          { playerId: taker.playerId, position: spot },
        ]),
        pending: null,
        nextSeq: timed.nextSeq + 1,
      },
    };
  }

  const corner = clampPitch({
    x: takingTeamId === timed.homeTeamId ? 98 : 2,
    y: timed.ball.y < 50 ? 4 : 96,
  });
  const taker =
    nearest(onPitchFor(timed.players, takingTeamId), corner) ??
    onPitchFor(timed.players, takingTeamId)[0];
  if (!taker) {
    throw new Error("No corner taker");
  }
  const takerInv = { ...asInvolved(taker), position: corner };
  const event: MatchEvent = {
    type: "restart",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock,
    ball: corner,
    involved: [takerInv],
    possessionTeamId: takingTeamId,
    phase: "corner",
    takingTeamId,
  };
  return {
    event,
    state: {
      ...timed,
      phase: "open_play",
      ball: corner,
      ballCarrierId: taker.playerId,
      possessionTeamId: takingTeamId,
      players: patchPlayers(timed.players, [
        { playerId: taker.playerId, position: corner },
      ]),
      pending: null,
      nextSeq: timed.nextSeq + 1,
    },
  };
}

