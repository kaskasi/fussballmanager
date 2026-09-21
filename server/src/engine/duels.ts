import type {
  DuelKind,
  MatchEvent,
  MatchState,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange, nextUnit, pickWeighted } from "@fussballmanager/shared";
import { withTime } from "./clock.ts";
import {
  asInvolved,
  attackingSign,
  clampPitch,
  lerp,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";
import { aerialContestAttribute, contestStrength } from "./weights.ts";
import { beginTransition } from "./moments.ts";

function pickKind(
  attacker: PlayerMatchStatus,
  defender: PlayerMatchStatus,
  rng: MatchState["rng"],
): { kind: DuelKind; rng: MatchState["rng"] } {
  const picked = pickWeighted(rng, [
    {
      item: "dribble" as const,
      weight: attacker.attributes.dribbling,
    },
    {
      item: "tackle" as const,
      weight: defender.attributes.tackling + defender.attributes.positioning * 0.3,
    },
    {
      item: "aerial" as const,
      weight: (attacker.attributes.aerial + defender.attributes.aerial) / 2,
    },
  ]);
  return { kind: picked.item, rng: picked.rng };
}

function attackerAttribute(kind: DuelKind, player: PlayerMatchStatus): number {
  if (kind === "aerial") {
    return aerialContestAttribute(player.attributes);
  }
  return player.attributes.dribbling;
}

function defenderAttribute(kind: DuelKind, player: PlayerMatchStatus): number {
  if (kind === "aerial") {
    return aerialContestAttribute(player.attributes);
  }
  return player.attributes.tackling;
}

export function stepDuel(
  state: MatchState,
  defender: PlayerMatchStatus,
): StepResult {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Cannot duel without a ball carrier");
  }
  const attacker = requirePlayer(state.players, state.ballCarrierId);
  const kindRoll = pickKind(attacker, defender, state.rng);
  const attackTactics =
    attacker.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const defendTactics =
    defender.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const att = contestStrength({
    attribute: attackerAttribute(kindRoll.kind, attacker),
    form: attacker.form,
    fatigue: attacker.fatigue,
    tacticBonus: attackTactics.mentality * 0.15,
  });
  const def = contestStrength({
    attribute: defenderAttribute(kindRoll.kind, defender),
    form: defender.form,
    fatigue: defender.fatigue,
    tacticBonus: defendTactics.pressing * 0.2,
  });
  const roll = nextUnit(kindRoll.rng);
  const attackerWins = roll.n < att / (att + def);
  const duration = nextRange(roll.rng, 1, 3);
  const contest = clampPitch(lerp(attacker.position, defender.position, 0.5));
  const sign = attackingSign(state.homeTeamId, attacker.teamId);
  const winnerPos = clampPitch({
    x: contest.x + (attackerWins ? 3 * sign : 0),
    y: contest.y,
  });
  const ball = winnerPos;
  const timed = withTime(state, duration.n, duration.rng);
  const clock = timed.clock;
  const attackerAfter = {
    ...asInvolved(attacker),
    position: attackerWins ? ball : contest,
  };
  const defenderAfter = {
    ...asInvolved(defender),
    position: attackerWins ? contest : ball,
  };
  const winnerId = attackerWins ? attacker.playerId : defender.playerId;

  const event: MatchEvent = {
    type: "duel",
    seq: state.nextSeq,
    matchId: state.matchId,
    clock,
    ball,
    involved: [attackerAfter, defenderAfter],
    possessionTeamId: attackerWins ? attacker.teamId : defender.teamId,
    kind: kindRoll.kind,
    attacker: attackerAfter,
    defender: defenderAfter,
    winnerId,
  };

  const nextState = {
    ...timed,
    ball,
    ballCarrierId: winnerId,
    possessionTeamId: attackerWins ? attacker.teamId : defender.teamId,
    lastPasserId: attackerWins ? timed.lastPasserId : null,
    players: patchPlayers(timed.players, [
      { playerId: attacker.playerId, position: attackerAfter.position },
      { playerId: defender.playerId, position: defenderAfter.position },
    ]),
    nextSeq: timed.nextSeq + 1,
  };
  return {
    event,
    state: attackerWins
      ? nextState
      : beginTransition(nextState, defender.teamId),
  };
}
