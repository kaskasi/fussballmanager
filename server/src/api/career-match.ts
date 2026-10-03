import {
  assertValidSquad,
  type BroadcastStoryContext,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { buildMatchView, parseViewSeed } from "./match-view.ts";

export interface CareerMatchInput {
  seed: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeSquad: Squad;
  awaySquad: Squad;
  playerClubSquad?: Squad;
  broadcastStory?: BroadcastStoryContext;
}

export function parseCareerMatchBody(body: unknown): CareerMatchInput {
  const payload = body as {
    seed?: number;
    homeTeamId?: TeamId;
    awayTeamId?: TeamId;
    homeSquad?: Squad;
    awaySquad?: Squad;
    playerClubSquad?: Squad;
    broadcastStory?: BroadcastStoryContext;
  };
  const seed = parseViewSeed(payload.seed);
  const homeTeamId = payload.homeTeamId;
  const awayTeamId = payload.awayTeamId;
  if (!homeTeamId || !awayTeamId) {
    throw new Error("homeTeamId and awayTeamId are required");
  }
  const homeSquad = payload.homeSquad;
  const awaySquad = payload.awaySquad;
  if (!homeSquad || !awaySquad) {
    throw new Error("homeSquad and awaySquad are required");
  }
  assertValidSquad(homeSquad);
  assertValidSquad(awaySquad);
  if (homeSquad.team.id !== homeTeamId || awaySquad.team.id !== awayTeamId) {
    throw new Error("Supplied squads must match homeTeamId and awayTeamId");
  }

  const playerClubSquad = payload.playerClubSquad;
  if (playerClubSquad) {
    assertValidSquad(playerClubSquad);
    if (
      playerClubSquad.team.id !== homeTeamId &&
      playerClubSquad.team.id !== awayTeamId
    ) {
      throw new Error("playerClubSquad must be home or away team");
    }
  }

  const broadcastStory = payload.broadcastStory;
  if (
    broadcastStory !== undefined &&
    broadcastStory !== null &&
    typeof broadcastStory !== "object"
  ) {
    throw new Error("broadcastStory must be an object when provided");
  }

  return {
    seed,
    homeTeamId,
    awayTeamId,
    homeSquad,
    awaySquad,
    playerClubSquad,
    broadcastStory: broadcastStory ?? undefined,
  };
}

export function runCareerMatch(input: CareerMatchInput) {
  const home =
    input.playerClubSquad?.team.id === input.homeTeamId
      ? input.playerClubSquad
      : input.homeSquad;
  const away =
    input.playerClubSquad?.team.id === input.awayTeamId
      ? input.playerClubSquad
      : input.awaySquad;
  const humanTeamId =
    input.playerClubSquad?.team.id === home.team.id ||
    input.playerClubSquad?.team.id === away.team.id
      ? input.playerClubSquad.team.id
      : home.team.id;
  return buildMatchView({
    seed: input.seed,
    home,
    away,
    humanTeamId,
    broadcastStory: input.broadcastStory,
  });
}
