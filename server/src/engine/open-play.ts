import type {
  MatchState,
  PlayerMatchStatus,
} from "@fussballmanager/shared";
import { pickWeighted, type RngState } from "@fussballmanager/shared";
import { distance, goalMouth, nearest, onPitchFor } from "./helpers.ts";
import { openPlayWeights } from "./weights.ts";

export type OpenPlayChoice = {
  action: "pass" | "carry" | "duel" | "shot";
  defender: PlayerMatchStatus | undefined;
  rng: RngState;
};

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
  const defender = nearest(onPitchFor(state.players, oppositionId), state.ball);
  const attackTactics =
    carrier.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const defendTactics =
    carrier.teamId === state.homeTeamId ? state.awayTactics : state.homeTactics;
  const dist = defender ? distance(carrier.position, defender.position) : 99;
  const distGoal = distance(
    carrier.position,
    goalMouth(state.homeTeamId, carrier.teamId),
  );
  const weights = openPlayWeights({
    distanceToDefender: dist,
    distanceToGoal: distGoal,
    pressing: defendTactics.pressing,
    tempo: attackTactics.tempo,
    mentality: attackTactics.mentality,
    passing: carrier.attributes.passing,
    dribbling: carrier.attributes.dribbling,
    pace: carrier.attributes.pace,
    shooting: carrier.attributes.shooting,
    form: carrier.form,
    fatigue: carrier.fatigue,
    strikerBonus: carrier.role === "ST",
  });
  const picked = pickWeighted(state.rng, [
    { item: "pass" as const, weight: weights.pass },
    { item: "carry" as const, weight: weights.carry },
    { item: "duel" as const, weight: defender ? weights.duel : 0 },
    { item: "shot" as const, weight: weights.shot },
  ]);
  const action =
    picked.item === "duel" && !defender ? "pass" : picked.item;
  return { action, defender, rng: picked.rng };
}
