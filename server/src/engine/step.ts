import type {
  MatchEvent,
  MatchState,
  StepInput,
  StepResult,
} from "@fussballmanager/shared";
import { advanceClock } from "./clock.ts";
import { asInvolved, movePlayer, onPitchFor, requirePlayer } from "./helpers.ts";
import { stepCarry } from "./carry.ts";
import { stepDuel } from "./duels.ts";
import { chooseOpenPlay } from "./open-play.ts";
import { stepPass, stepTurnover } from "./possession.ts";
import { resolvePending, stepShot } from "./shots.ts";

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
  const clock = advanceClock(state.clock, 1);
  const involved = [{ ...asInvolved(kicker), position: spot }];

  const event: MatchEvent = {
    type: "kickoff",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball: spot,
    involved,
    possessionTeamId: kickingTeamId,
    kickingTeamId,
  };

  return {
    event,
    state: {
      ...state,
      clock,
      phase: "open_play",
      ball: spot,
      ballCarrierId: kicker.playerId,
      possessionTeamId: kickingTeamId,
      players: movePlayer(state.players, kicker.playerId, spot),
      nextSeq: state.nextSeq + 1,
    },
  };
}

export function step(input: StepInput): StepResult {
  const state = withTactics(input);

  if (state.pending) {
    return resolvePending(state);
  }

  if (state.phase === "pre_match" || state.phase === "kickoff") {
    return stepKickoff(state);
  }

  if (state.phase !== "open_play") {
    throw new Error(`step() does not handle phase ${state.phase} yet`);
  }

  if (!state.possessionTeamId) {
    throw new Error("Open play requires possession");
  }

  if (!state.ballCarrierId) {
    return stepTurnover(state);
  }

  const carrier = requirePlayer(state.players, state.ballCarrierId);
  if (!onPitchFor(state.players, carrier.teamId).some((p) => p.playerId === carrier.playerId)) {
    return stepTurnover(state);
  }

  const choice = chooseOpenPlay(state);
  const next = { ...state, rng: choice.rng };
  if (choice.action === "duel" && choice.defender) {
    return stepDuel(next, choice.defender);
  }
  if (choice.action === "carry") {
    return stepCarry(next);
  }
  if (choice.action === "shot") {
    return stepShot(next);
  }
  return stepPass(next);
}

export function stepMany(input: StepInput, count: number): {
  events: MatchEvent[];
  state: MatchState;
} {
  let current = withTactics(input);
  const events: MatchEvent[] = [];
  for (let i = 0; i < count; i += 1) {
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
