import type {
  CardColor,
  MatchEvent,
  MatchState,
  PlayerId,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextUnit } from "@fussballmanager/shared";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  clamp,
  onPitchFor,
  requirePlayer,
  updatePlayer,
} from "./helpers.ts";

const MAX_SUBS = 3;

function isSoleOnPitchGk(
  state: MatchState,
  player: PlayerMatchStatus,
): boolean {
  if (player.role !== "GK") {
    return false;
  }
  return (
    onPitchFor(state.players, player.teamId).filter((p) => p.role === "GK")
      .length <= 1
  );
}

function hasBenchGk(state: MatchState, teamId: PlayerMatchStatus["teamId"]): boolean {
  return state.players.some(
    (player) =>
      player.teamId === teamId &&
      player.role === "GK" &&
      !player.onPitch &&
      !player.sentOff,
  );
}

export function duelFoulChance(input: {
  pressing: number;
  fatigue: number;
  kindTackle: boolean;
}): number {
  const base = input.kindTackle ? 0.14 : 0.05;
  return clamp(
    base * (0.6 + 0.8 * (input.pressing / 100)) * (0.85 + input.fatigue / 200),
    0.03,
    0.28,
  );
}

export function duelInjuryChance(fatigue: number): number {
  return clamp(0.01 + fatigue / 4000, 0.008, 0.03);
}

export function pickDuelInterruption(
  state: MatchState,
  defender: PlayerMatchStatus,
  kindTackle: boolean,
): { kind: "foul" | "injury" | "none"; rng: MatchState["rng"] } {
  const defendTactics =
    defender.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const foulP = duelFoulChance({
    pressing: defendTactics.pressing,
    fatigue: defender.fatigue,
    kindTackle,
  });
  const foulRoll = nextUnit(state.rng);
  if (foulRoll.n < foulP) {
    return { kind: "foul", rng: foulRoll.rng };
  }
  const injuryRoll = nextUnit(foulRoll.rng);
  if (injuryRoll.n < duelInjuryChance(defender.fatigue)) {
    return { kind: "injury", rng: injuryRoll.rng };
  }
  return { kind: "none", rng: injuryRoll.rng };
}

function cardForFoul(
  fouler: PlayerMatchStatus,
  rng: MatchState["rng"],
): { card?: CardColor; rng: MatchState["rng"] } {
  const roll = nextUnit(rng);
  if (roll.n < 0.04) {
    return { card: "red", rng: roll.rng };
  }
  if (roll.n < 0.38) {
    const color: CardColor = fouler.yellowCards >= 1 ? "second_yellow" : "yellow";
    return { card: color, rng: roll.rng };
  }
  return { rng: roll.rng };
}

export function stepFoul(
  state: MatchState,
  fouler: PlayerMatchStatus,
  fouled: PlayerMatchStatus,
): StepResult {
  const carded = cardForFoul(fouler, state.rng);
  const timed = withTime(state, 2, carded.rng);
  const foulerInv = asInvolved(fouler);
  const fouledInv = asInvolved(fouled);
  const event: MatchEvent = {
    type: "foul",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock: timed.clock,
    ball: fouled.position,
    involved: [foulerInv, fouledInv],
    possessionTeamId: fouled.teamId,
    fouler: foulerInv,
    fouled: fouledInv,
    ...(carded.card ? { card: carded.card } : {}),
  };
  const restart = {
    type: "restart" as const,
    phase: "free_kick" as const,
    takingTeamId: fouled.teamId,
  };
  return {
    event,
    state: {
      ...timed,
      phase: "free_kick",
      ball: fouled.position,
      ballCarrierId: fouled.playerId,
      possessionTeamId: fouled.teamId,
      lastPasserId: null,
      pending: carded.card
        ? {
            type: "card",
            playerId: fouler.playerId,
            color: carded.card,
            thenRestart: {
              phase: "free_kick",
              takingTeamId: fouled.teamId,
            },
          }
        : restart,
      nextSeq: timed.nextSeq + 1,
    },
  };
}

export function stepCard(
  state: MatchState,
  playerId: PlayerId,
  color: CardColor,
  thenRestart: { phase: "free_kick"; takingTeamId: MatchState["homeTeamId"] } | undefined,
): StepResult {
  const player = requirePlayer(state.players, playerId);
  const sentOffRaw = color === "red" || color === "second_yellow";
  const sentOff =
    sentOffRaw &&
    !(isSoleOnPitchGk(state, player) && !hasBenchGk(state, player.teamId));
  const yellowCards =
    color === "yellow" || color === "second_yellow"
      ? player.yellowCards + 1
      : player.yellowCards;
  const timed = withTime(state, 1, state.rng);
  const involved = asInvolved({
    ...player,
    yellowCards,
    sentOff,
    onPitch: sentOff ? false : player.onPitch,
  });
  const event: MatchEvent = {
    type: "card",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock: timed.clock,
    ball: timed.ball,
    involved: [involved],
    possessionTeamId: timed.possessionTeamId,
    player: involved,
    color,
  };
  const teamKey = player.teamId === timed.homeTeamId ? "home" : "away";
  const gkSub =
    sentOff &&
    player.role === "GK" &&
    hasBenchGk(timed, player.teamId) &&
    timed.substitutionsUsed[teamKey] < MAX_SUBS;
  const pending = gkSub
    ? {
        type: "substitution" as const,
        teamId: player.teamId,
        playerOffId: playerId,
      }
    : thenRestart
      ? {
          type: "restart" as const,
          phase: thenRestart.phase,
          takingTeamId: thenRestart.takingTeamId,
        }
      : null;
  return {
    event,
    state: {
      ...timed,
      players: updatePlayer(timed.players, playerId, {
        yellowCards,
        sentOff,
        onPitch: sentOff ? false : player.onPitch,
      }),
      ballCarrierId:
        sentOff && timed.ballCarrierId === playerId ? null : timed.ballCarrierId,
      pending,
      phase: pending ? timed.phase : "open_play",
      nextSeq: timed.nextSeq + 1,
    },
  };
}

export function stepInjury(
  state: MatchState,
  playerId: PlayerId,
): StepResult {
  const player = requirePlayer(state.players, playerId);
  const severityRoll = nextUnit(state.rng);
  const severity: "knock" | "off" | "stretcher" =
    severityRoll.n < 0.55 ? "knock" : severityRoll.n < 0.9 ? "off" : "stretcher";
  const timed = withTime(state, 3, severityRoll.rng);
  const involved = asInvolved(player);
  const event: MatchEvent = {
    type: "injury",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock: timed.clock,
    ball: timed.ball,
    involved: [involved],
    possessionTeamId: timed.possessionTeamId,
    player: involved,
    severity,
  };
  const teamKey = player.teamId === timed.homeTeamId ? "home" : "away";
  const gkLocked =
    isSoleOnPitchGk(timed, player) && !hasBenchGk(timed, player.teamId);
  const leaves = severity !== "knock" && !gkLocked;
  const hasBench = timed.players.some(
    (candidate) =>
      candidate.teamId === player.teamId &&
      !candidate.onPitch &&
      !candidate.sentOff &&
      candidate.playerId !== playerId,
  );
  const canSub = leaves && hasBench && timed.substitutionsUsed[teamKey] < MAX_SUBS;
  return {
    event,
    state: {
      ...timed,
      players: leaves
        ? updatePlayer(timed.players, playerId, { onPitch: false })
        : timed.players,
      ballCarrierId:
        leaves && timed.ballCarrierId === playerId ? null : timed.ballCarrierId,
      pending: canSub
        ? { type: "substitution", teamId: player.teamId, playerOffId: playerId }
        : null,
      phase: canSub ? timed.phase : "open_play",
      nextSeq: timed.nextSeq + 1,
    },
  };
}

function pickSubstitute(
  state: MatchState,
  teamId: PlayerMatchStatus["teamId"],
  off: PlayerMatchStatus,
): PlayerMatchStatus | undefined {
  const bench = state.players.filter(
    (player) =>
      player.teamId === teamId &&
      player.playerId !== off.playerId &&
      !player.onPitch &&
      !player.sentOff,
  );
  return (
    bench.find((player) => player.role === off.role) ??
    bench.find((player) => player.role !== "GK") ??
    bench[0]
  );
}

export function stepSubstitution(
  state: MatchState,
  teamId: PlayerMatchStatus["teamId"],
  playerOffId: PlayerId,
): StepResult {
  const off = requirePlayer(state.players, playerOffId);
  const on = pickSubstitute(state, teamId, off);
  if (!on) {
    const timed = withTime(state, 1, state.rng);
    return {
      event: {
        type: "injury",
        seq: timed.nextSeq,
        matchId: timed.matchId,
        clock: timed.clock,
        ball: timed.ball,
        involved: [asInvolved(off)],
        possessionTeamId: timed.possessionTeamId,
        player: asInvolved(off),
        severity: "off",
      },
      state: { ...timed, pending: null, nextSeq: timed.nextSeq + 1 },
    };
  }
  const timed = withTime(state, 2, state.rng);
  const offInv = { ...asInvolved(off), position: off.position };
  const onInv = { ...asInvolved(on), position: off.position };
  const teamKey = teamId === timed.homeTeamId ? "home" : "away";
  const event: MatchEvent = {
    type: "substitution",
    seq: timed.nextSeq,
    matchId: timed.matchId,
    clock: timed.clock,
    ball: timed.ball,
    involved: [offInv, onInv],
    possessionTeamId: timed.possessionTeamId,
    teamId,
    playerOff: offInv,
    playerOn: onInv,
  };
  const players = updatePlayer(
    updatePlayer(timed.players, playerOffId, { onPitch: false }),
    on.playerId,
    { onPitch: true, position: off.position },
  );
  return {
    event,
    state: {
      ...timed,
      players,
      substitutionsUsed: {
        ...timed.substitutionsUsed,
        [teamKey]: timed.substitutionsUsed[teamKey] + 1,
      },
      pending: null,
      phase: "open_play",
      nextSeq: timed.nextSeq + 1,
    },
  };
}

export function resolveDisciplinePending(state: MatchState): StepResult {
  const pending = state.pending;
  if (!pending) {
    throw new Error("No discipline follow-up");
  }
  if (pending.type === "card") {
    return stepCard(state, pending.playerId, pending.color, pending.thenRestart);
  }
  if (pending.type === "injury") {
    return stepInjury(state, pending.playerId);
  }
  if (pending.type === "substitution") {
    return stepSubstitution(state, pending.teamId, pending.playerOffId);
  }
  throw new Error(`Unhandled discipline pending ${pending.type}`);
}
