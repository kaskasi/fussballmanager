import {
  assertValidSquad,
  SEED_DIVISION,
  SEED_OBERLIGA,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { buildMatchView, parseViewSeed } from "./match-view.ts";

const ALL_LEAGUE_SQUADS: Squad[] = [...SEED_DIVISION, ...SEED_OBERLIGA];

export interface CareerMatchInput {
  seed: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  playerClubSquad?: Squad;
}

export function parseCareerMatchBody(body: unknown): CareerMatchInput {
  const payload = body as {
    seed?: number;
    homeTeamId?: TeamId;
    awayTeamId?: TeamId;
    playerClubSquad?: Squad;
  };
  const seed = parseViewSeed(payload.seed);
  const homeTeamId = payload.homeTeamId;
  const awayTeamId = payload.awayTeamId;
  if (!homeTeamId || !awayTeamId) {
    throw new Error("homeTeamId and awayTeamId are required");
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

  return { seed, homeTeamId, awayTeamId, playerClubSquad };
}

function squadsForCareerMatch(playerClubSquad?: Squad): Squad[] {
  if (!playerClubSquad) return ALL_LEAGUE_SQUADS;
  return ALL_LEAGUE_SQUADS.map((squad) =>
    squad.team.id === playerClubSquad.team.id ? playerClubSquad : squad,
  );
}

export function runCareerMatch(input: CareerMatchInput) {
  const squads = squadsForCareerMatch(input.playerClubSquad);
  const home = squads.find((squad) => squad.team.id === input.homeTeamId);
  const away = squads.find((squad) => squad.team.id === input.awayTeamId);
  if (!home || !away) {
    throw new Error("Unknown home or away team for career match");
  }
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
  });
}
