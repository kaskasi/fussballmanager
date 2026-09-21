import type {
  DuelKind,
  MatchEvent,
  MatchState,
  PlayerMatchStatus,
  StepResult,
} from "@fussballmanager/shared";
import { nextRange, nextUnit, pickWeighted } from "@fussballmanager/shared";
import { advanceClock } from "./clock.ts";
import {
  asInvolved,
  attackingSign,
  clampPitch,
  lerp,
  patchPlayers,
  requirePlayer,
} from "./helpers.ts";
import { contestStrength } from "./weights.ts";

function pickKind(
  attacker: PlayerMatchStatus,
  defender: PlayerMatchStatus,
  rng: MatchState["rng"],
): { kind: DuelKind; rng: MatchState["rng"] } {
  const picked = pickWeighted(rng, [
    {
      item: "dribble" as const,
      weight: attacker.attributes.dribbling + attacker.attributes.pace * 0.4,
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
    return player.attributes.aerial;
  }
  return player.attributes.dribbling;
}

function defenderAttribute(kind: DuelKind, player: PlayerMatchStatus): number {
  if (kind === "aerial") {
    return player.attributes.aerial;
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
  const clock = advanceClock(state.clock, duration.n);
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

  return {
    event,
    state: {
      ...state,
      clock,
      ball,
      ballCarrierId: winnerId,
      possessionTeamId: attackerWins ? attacker.teamId : defender.teamId,
      lastPasserId: attackerWins ? state.lastPasserId : null,
      players: patchPlayers(state.players, [
        { playerId: attacker.playerId, position: attackerAfter.position },
        { playerId: defender.playerId, position: defenderAfter.position },
      ]),
      rng: duration.rng,
      nextSeq: state.nextSeq + 1,
    },
  };
}
