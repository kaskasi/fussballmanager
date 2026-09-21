import type {
  MatchState,
  PlayerMatchStatus,
} from "@fussballmanager/shared";
import { pickWeighted, type RngState } from "@fussballmanager/shared";
import { attackingSign, distance, goalMouth, nearest, onPitchFor } from "./helpers.ts";
import { inGainedBall } from "./moments.ts";
import { defendingPressure } from "./pressure.ts";
import { depthFromOwnGoal } from "./shape.ts";
import { openPlayWeights } from "./weights.ts";

export type OpenPlayChoice = {
  action: "pass" | "carry" | "duel" | "shot";
  defender: PlayerMatchStatus | undefined;
  rng: RngState;
};

export function pickChallenger(
  live: readonly PlayerMatchStatus[],
  state: MatchState,
  oppositionId: PlayerMatchStatus["teamId"],
): PlayerMatchStatus | undefined {
  const outfield = live.filter((player) => player.role !== "GK");
  const nearestOut = nearest(outfield, state.ball);
  const gk = live.find((player) => player.role === "GK");
  if (!gk) {
    return nearestOut;
  }
  const tactics =
    oppositionId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const attackId = state.possessionTeamId;
  if (!attackId) {
    return nearestOut;
  }
  const gkOwnGoal =
    oppositionId === state.homeTeamId ? { x: 0, y: 50 } : { x: 100, y: 50 };
  const gkSign = attackingSign(state.homeTeamId, oppositionId);
  const ballDepth = depthFromOwnGoal(state.ball, gkOwnGoal, gkSign);
  const gkDist = distance(gk.position, state.ball);
  const outDist = nearestOut
    ? distance(nearestOut.position, state.ball)
    : 99;
  if (
    tactics.keeperDuty === "sweeper" &&
    ballDepth < 28 &&
    gkDist < 10 &&
    gkDist + 4 < outDist
  ) {
    return gk;
  }
  if (tactics.keeperDuty === "stay" && ballDepth < 12 && gkDist < 7) {
    return gk;
  }
  return nearestOut;
}

export function chooseOpenPlay(state: MatchState): OpenPlayChoice {
  if (!state.possessionTeamId || !state.ballCarrierId) {
    throw new Error("Open play choice needs possession and a carrier");
  }
  const carrier = state.players.find(
    (player) => player.playerId === state.ballCarrierId,
  );
  if (!carrier) {
    throw new Error("Ball carrier missing from state");
  }
  const oppositionId =
    carrier.teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const live = onPitchFor(state.players, oppositionId);
  const defender = pickChallenger(live, state, oppositionId);
  const attackTactics =
    carrier.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const dist = defender ? distance(carrier.position, defender.position) : 99;
  const distGoal = distance(
    carrier.position,
    goalMouth(state.homeTeamId, carrier.teamId),
  );
  const pressure = defendingPressure(state, oppositionId);
  const teammates = onPitchFor(state.players, carrier.teamId).filter(
    (player) => player.playerId !== carrier.playerId,
  );
  const weights = openPlayWeights({
    distanceToDefender: dist,
    distanceToGoal: distGoal,
    pressing: pressure.pressing,
    tempo: attackTactics.tempo,
    mentality: attackTactics.mentality,
    passing: carrier.attributes.passing,
    dribbling: carrier.attributes.dribbling,
    pace: carrier.attributes.pace,
    shooting: carrier.attributes.shooting,
    form: carrier.form,
    fatigue: carrier.fatigue,
    strikerBonus:
      carrier.role === "ST" ||
      ((carrier.role === "W" || carrier.role === "AM") && distGoal < 22),
    transitionAttack: inGainedBall(state),
    restCovers: pressure.restCovers,
    localPress: pressure.localCount,
  });
  const onCooldown =
    state.duelCooldownUntil !== null &&
    state.periodElapsedSeconds < state.duelCooldownUntil;
  const picked = pickWeighted(state.rng, [
    { item: "pass" as const, weight: teammates.length > 0 ? weights.pass : 0 },
    { item: "carry" as const, weight: weights.carry },
    {
      item: "duel" as const,
      weight: defender && !onCooldown ? weights.duel : 0,
    },
    { item: "shot" as const, weight: weights.shot },
  ]);
  let action =
    picked.item === "duel" && !defender ? "pass" : picked.item;
  if (action === "pass" && teammates.length === 0) {
    action = weights.shot > weights.carry ? "shot" : "carry";
  }
  return { action, defender, rng: picked.rng };
}
