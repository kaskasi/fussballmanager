import type {
  MatchEvent,
  MatchState,
  SimulateResult,
  StepInput,
  StepResult,
} from "@fussballmanager/shared";
import {
  clockFromElapsed,
  ensureStoppage,
  periodTimeUp,
  withTime,
} from "./clock.ts";
import { asInvolved, movePlayer, onPitchFor, requirePlayer } from "./helpers.ts";
import { stepCarry } from "./carry.ts";
import { stepDuel } from "./duels.ts";
import { pickDuelInterruption, stepFoul, stepInjury } from "./discipline.ts";
import { chooseOpenPlay } from "./open-play.ts";
import { stepPass, stepTurnover } from "./possession.ts";
import { resolvePending, stepShot } from "./shots.ts";
import { clearTransition, settleTransition } from "./moments.ts";
import { applyShape } from "./shape.ts";

function withTactics(input: StepInput): MatchState {
  return {
    ...input.state,
    homeTactics: input.homeTactics,
    awayTactics: input.awayTactics,
  };
}

function stepKickoff(state: MatchState): StepResult {
  const kickingTeamId = state.possessionTeamId;
  if (!kickingTeamId) {
    throw new Error("Kickoff needs a possessing / kicking team");
  }
  const kickerId = state.ballCarrierId;
  if (!kickerId) {
    throw new Error("Kickoff needs a ball carrier");
  }
  const kicker = requirePlayer(state.players, kickerId);
  const spot = { x: 50, y: 50 };
  const timed = withTime(state, 1, state.rng);
  const clock = timed.clock;
  const involved = [{ ...asInvolved(kicker), position: spot }];

  const event: MatchEvent = {
    type: "kickoff",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock,
    ball: spot,
    involved,
    possessionTeamId: kickingTeamId,
    kickingTeamId,
  };

  return {
    event,
    state: {
      ...timed,
      phase: "open_play",
      ball: spot,
      ballCarrierId: kicker.playerId,
      possessionTeamId: kickingTeamId,
      players: movePlayer(timed.players, kicker.playerId, spot),
      nextSeq: timed.nextSeq + 1,
    },
  };
}

function stepPeriodEnd(state: MatchState): StepResult {
  const period =
    state.clock.period === "second_half" ? "second_half" : "first_half";
  const event: MatchEvent = {
    type: "period_end",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock: state.clock,
    ball: state.ball,
    involved: [],
    possessionTeamId: state.possessionTeamId,
    period,
  };
  return {
    event,
    state: {
      ...state,
      phase: period === "first_half" ? "half_time" : "full_time",
      pending: null,
      nextSeq: state.nextSeq + 1,
    },
  };
}

function beginSecondHalf(state: MatchState): MatchState {
  const kickingTeamId =
    state.firstKickoffTeamId === state.homeTeamId
      ? state.awayTeamId
      : state.homeTeamId;
  const kicker =
    onPitchFor(state.players, kickingTeamId).find((player) => player.role === "ST") ??
    onPitchFor(state.players, kickingTeamId)[0];
  if (!kicker) {
    throw new Error("No second-half kicker");
  }
  const spot = { x: 50, y: 50 };
  return {
    ...state,
    clock: clockFromElapsed("second_half", 0),
    periodElapsedSeconds: 0,
    stoppageAllowanceSeconds: 0,
    phase: "kickoff",
    ball: spot,
    ballCarrierId: kicker.playerId,
    possessionTeamId: kickingTeamId,
    lastPasserId: null,
    pending: null,
    players: movePlayer(state.players, kicker.playerId, spot),
    transitionGainedTeamId: null,
    transitionUntilElapsed: null,
  };
}

function stepMatchEnd(state: MatchState): StepResult {
  const clock = { ...state.clock, period: "full_time" as const };
  const event: MatchEvent = {
    type: "match_end",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: state.ball,
    involved: [],
    possessionTeamId: null,
    homeGoals: state.score.home,
    awayGoals: state.score.away,
  };
  return {
    event,
    state: {
      ...state,
      clock,
      phase: "full_time",
      nextSeq: state.nextSeq + 1,
    },
  };
}

function finalize(result: StepResult): StepResult {
  if (result.event.type === "period_end" || result.event.type === "match_end") {
    return {
      ...result,
      state: clearTransition(result.state),
    };
  }
  const locked = new Set(
    result.event.involved.map((player) => player.playerId),
  );
  return {
    ...result,
    state: {
      ...result.state,
      players: applyShape(result.state, locked),
    },
  };
}

export function step(input: StepInput): StepResult {
  return finalize(stepInner(input));
}

function stepInner(input: StepInput): StepResult {
  const state = settleTransition(withTactics(input));

  if (state.clock.period === "full_time") {
    throw new Error("Match is over");
  }

  if (state.pending) {
    return resolvePending(state);
  }

  if (state.phase === "full_time") {
    return stepMatchEnd(state);
  }

  if (state.phase === "half_time") {
    return stepKickoff(beginSecondHalf(state));
  }

  const timed = ensureStoppage(state);
  if (
    periodTimeUp(timed) &&
    timed.phase !== "pre_match" &&
    timed.phase !== "kickoff" &&
    timed.phase !== "half_time"
  ) {
    return stepPeriodEnd(timed);
  }

  if (timed.phase === "pre_match" || timed.phase === "kickoff") {
    return stepKickoff(timed);
  }

  if (timed.phase === "penalty") {
    if (!timed.ballCarrierId) {
      return stepTurnover(timed);
    }
    return stepShot(timed);
  }

  if (
    timed.phase !== "open_play" &&
    timed.phase !== "free_kick" &&
    timed.phase !== "goal_kick" &&
    timed.phase !== "corner" &&
    timed.phase !== "throw_in" &&
    timed.phase !== "goal_restart"
  ) {
    throw new Error(`step() does not handle phase ${timed.phase} yet`);
  }

  if (!timed.possessionTeamId) {
    throw new Error("Open play requires possession");
  }

  if (!timed.ballCarrierId) {
    return stepTurnover(timed);
  }

  const carrier = requirePlayer(timed.players, timed.ballCarrierId);
  if (
    !onPitchFor(timed.players, carrier.teamId).some(
      (player) => player.playerId === carrier.playerId,
    )
  ) {
    return stepTurnover(timed);
  }

  const choice = chooseOpenPlay(timed);
  const next = { ...timed, rng: choice.rng };
  if (choice.action === "duel" && choice.defender) {
    const carrierId = next.ballCarrierId;
    if (!carrierId) {
      return stepTurnover(next);
    }
    const attacker = requirePlayer(next.players, carrierId);
    const interrupt = pickDuelInterruption(next, choice.defender, true);
    const interrupted = { ...next, rng: interrupt.rng };
    if (interrupt.kind === "foul") {
      return stepFoul(interrupted, choice.defender, attacker);
    }
    if (interrupt.kind === "injury") {
      return stepInjury(interrupted, attacker.playerId);
    }
    return stepDuel(interrupted, choice.defender);
  }
  if (choice.action === "carry") {
    return stepCarry(next);
  }
  if (choice.action === "shot") {
    return stepShot(next);
  }
  return stepPass(next);
}

export function stepMany(
  input: StepInput,
  count: number,
): {
  events: MatchEvent[];
  state: MatchState;
} {
  let current = withTactics(input);
  const events: MatchEvent[] = [];
  for (let i = 0; i < count; i += 1) {
    if (current.clock.period === "full_time") {
      break;
    }
    const result = step({
      state: current,
      homeTactics: current.homeTactics,
      awayTactics: current.awayTactics,
    });
    events.push(result.event);
    current = result.state;
  }
  return { events, state: current };
}

export function simulate(input: StepInput, maxSteps = 20_000): SimulateResult {
  let current = withTactics(input);
  const events: MatchEvent[] = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const result = step({
      state: current,
      homeTactics: current.homeTactics,
      awayTactics: current.awayTactics,
    });
    events.push(result.event);
    current = result.state;
    if (result.event.type === "match_end") {
      return { events, finalState: current };
    }
  }
  throw new Error(`simulate() exceeded ${maxSteps} steps`);
}
