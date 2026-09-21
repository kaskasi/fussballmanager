import type {
  MatchState,
  PlayerMatchStatus,
} from "@fussballmanager/shared";
import { pickWeighted, type RngState } from "@fussballmanager/shared";
import {
  attackingSign,
  distance,
  goalMouth,
  nearest,
  onPitchFor,
} from "./helpers.ts";
import { inGainedBall } from "./moments.ts";
import {
  isCornerSituation,
  isGoalKickSituation,
  isWideFinalThird,
  countUsefulOutlets,
  bestThroughLead,
} from "./pass-graph.ts";
import { openKeeperLook } from "./lanes.ts";
import { defendingPressure } from "./pressure.ts";
import { depthFromOwnGoal } from "./shape.ts";
import { carryPermission, openPlayWeights } from "./weights.ts";

export type OpenPlayChoice = {
  action: "pass" | "carry" | "duel" | "shot" | "cross" | "through";
  defender: PlayerMatchStatus | undefined;
  rng: RngState;
};

function pressRoleScore(role: PlayerMatchStatus["role"], pressing: number): number {
  switch (role) {
    case "GK":
      return 0.05;
    case "CB":
      return 0.32;
    case "FB":
      return 0.75;
    case "DM":
      return 1.15;
    case "CM":
      return 1.25;
    case "AM":
    case "W":
    case "ST":
      return 0.55 + (pressing / 100) * 0.7;
    default: {
      const _never: never = role;
      return _never;
    }
  }
}

export function pickPressUnit(
  live: readonly PlayerMatchStatus[],
  state: MatchState,
  oppositionId: PlayerMatchStatus["teamId"],
): { presser: PlayerMatchStatus | undefined; cover: PlayerMatchStatus | undefined } {
  const outfield = live.filter((player) => player.role !== "GK");
  const gk = live.find((player) => player.role === "GK");
  const tactics =
    oppositionId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const nearestOut = nearest(outfield, state.ball);
  if (!gk) {
    return { presser: nearestOut, cover: undefined };
  }
  const gkOwnGoal =
    oppositionId === state.homeTeamId ? { x: 0, y: 50 } : { x: 100, y: 50 };
  const gkSign = attackingSign(state.homeTeamId, oppositionId);
  const ballDepth = depthFromOwnGoal(state.ball, gkOwnGoal, gkSign);
  const gkDist = distance(gk.position, state.ball);
  const outDist = nearestOut ? distance(nearestOut.position, state.ball) : 99;
  if (
    tactics.keeperDuty === "sweeper" &&
    ballDepth < 28 &&
    gkDist < 10 &&
    gkDist + 4 < outDist
  ) {
    return { presser: gk, cover: nearestOut };
  }
  if (tactics.keeperDuty === "stay" && ballDepth < 12 && gkDist < 7) {
    return { presser: gk, cover: nearestOut };
  }

  let presser: PlayerMatchStatus | undefined;
  let best = Number.NEGATIVE_INFINITY;
  for (const player of outfield) {
    const dist = distance(player.position, state.ball);
    const score = pressRoleScore(player.role, tactics.pressing) / (1 + dist);
    if (score > best) {
      best = score;
      presser = player;
    }
  }
  let cover: PlayerMatchStatus | undefined;
  let coverBest = Number.NEGATIVE_INFINITY;
  for (const player of outfield) {
    if (presser && player.playerId === presser.playerId) {
      continue;
    }
    if (player.role === "W" || player.role === "ST" || player.role === "AM") {
      continue;
    }
    const dist = distance(player.position, state.ball);
    const goalSide = depthFromOwnGoal(player.position, gkOwnGoal, gkSign);
    const score =
      (player.role === "DM" || player.role === "CB" ? 1.3 : 1) /
      (1 + dist) *
      (1 + goalSide / 80);
    if (score > coverBest) {
      coverBest = score;
      cover = player;
    }
  }
  return { presser, cover };
}

/** @deprecated use pickPressUnit; kept as the duel opponent. */
export function pickChallenger(
  live: readonly PlayerMatchStatus[],
  state: MatchState,
  oppositionId: PlayerMatchStatus["teamId"],
): PlayerMatchStatus | undefined {
  return pickPressUnit(live, state, oppositionId).presser;
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
  const { presser: defender } = pickPressUnit(live, state, oppositionId);
  const attackTactics =
    carrier.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const dist = defender ? distance(carrier.position, defender.position) : 99;
  const ownGoal =
    carrier.teamId === state.homeTeamId ? { x: 0, y: 50 } : { x: 100, y: 50 };
  const attackSign = attackingSign(state.homeTeamId, carrier.teamId);
  const mouth = goalMouth(state.homeTeamId, carrier.teamId);
  const distGoal = distance(carrier.position, mouth);
  const pressure = defendingPressure(state, oppositionId);
  const teammates = onPitchFor(state.players, carrier.teamId).filter(
    (player) => player.playerId !== carrier.playerId,
  );
  const usefulOutlets = countUsefulOutlets(
    carrier,
    teammates,
    ownGoal,
    attackSign,
    live,
    state.homeTeamId,
  );
  const keeperLook = openKeeperLook({
    from: carrier.position,
    mouth,
    defenders: live,
    distanceToGoal: distGoal,
  });
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
    strikerBonus: false,
    openKeeperLook: keeperLook,
    transitionAttack: inGainedBall(state),
    restCovers: pressure.restCovers,
    localPress: Math.min(pressure.localCount, 2),
    usefulOutlets,
  });
  const onCooldown =
    state.duelCooldownUntil !== null &&
    state.periodElapsedSeconds < state.duelCooldownUntil;
  const permission = carryPermission(carrier, attackTactics, distGoal);
  const goalKick = isGoalKickSituation(carrier, ownGoal, attackSign);
  const corner = isCornerSituation(carrier);
  const wideFinal = isWideFinalThird(state.ball, ownGoal, attackSign);
  const throughLead = bestThroughLead(
    carrier,
    teammates,
    ownGoal,
    attackSign,
    live,
    state.homeTeamId,
  );
  const throughOn =
    !!throughLead &&
    distGoal > 8 &&
    distGoal < 48 &&
    carrier.role !== "GK" &&
    carrier.role !== "CB";
  const passWeight = teammates.length > 0 ? weights.pass : 0;
  const picked = pickWeighted(state.rng, [
    {
      item: "pass" as const,
      weight: goalKick ? passWeight * 2.4 : passWeight,
    },
    {
      item: "carry" as const,
      weight: goalKick || corner ? 0.03 : weights.carry * permission,
    },
    {
      item: "duel" as const,
      weight: defender && !onCooldown && !goalKick ? weights.duel : 0,
    },
    { item: "shot" as const, weight: goalKick || corner ? 0 : weights.shot },
    {
      item: "cross" as const,
      weight:
        teammates.length === 0
          ? 0
          : corner
            ? 3.4
            : wideFinal &&
                (carrier.role === "W" ||
                  carrier.role === "FB" ||
                  carrier.role === "AM")
              ? 0.62 + attackTactics.mentality / 180
              : 0,
    },
    {
      item: "through" as const,
      weight:
        teammates.length === 0 || goalKick || corner
          ? 0
          : throughOn
            ? 0.42 +
              throughLead.quality * 0.5 +
              attackTactics.tempo / 240 +
              attackTactics.mentality / 280
            : 0,
    },
  ]);
  let action =
    picked.item === "duel" && !defender ? "pass" : picked.item;
  if (action === "pass" && teammates.length === 0) {
    action = weights.shot > weights.carry ? "shot" : "carry";
  }
  if (
    action === "pass" &&
    usefulOutlets === 0 &&
    distGoal < 22 &&
    !goalKick &&
    !corner &&
    weights.shot >= weights.pass
  ) {
    action = "shot";
  }
  if (
    action === "pass" &&
    keeperLook &&
    !goalKick &&
    !corner &&
    weights.shot > weights.pass
  ) {
    action = "shot";
  }
  return { action, defender, rng: picked.rng };
}
