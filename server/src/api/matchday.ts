import {
  assertValidSquad,
  SEED_DIVISION,
  SEED_OBERLIGA,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { playMatchday } from "../engine/matchday.ts";

const ALL_LEAGUE_SQUADS: Squad[] = [...SEED_DIVISION, ...SEED_OBERLIGA];

export interface MatchdayInput {
  matchday: number;
  baseSeed: number;
  clubIds?: TeamId[];
  playerClubSquad?: Squad;
}

export function parseMatchdayBody(body: unknown): MatchdayInput {
  const payload = body as {
    matchday?: number;
    baseSeed?: number;
    clubIds?: TeamId[];
    playerClubSquad?: Squad;
  };
  const matchday = Number(payload.matchday ?? 1);
  const baseSeed = Number(payload.baseSeed ?? 2026);
  if (!Number.isFinite(matchday) || matchday < 1) {
    throw new Error("matchday must be >= 1");
  }
  if (!Number.isFinite(baseSeed)) {
    throw new Error("baseSeed must be a number");
  }

  const playerClubSquad = payload.playerClubSquad;
  if (playerClubSquad) {
    assertValidSquad(playerClubSquad);
    const clubIds = payload.clubIds ?? SEED_DIVISION.map((squad) => squad.team.id);
    if (!clubIds.includes(playerClubSquad.team.id)) {
      throw new Error("playerClubSquad must belong to a club in clubIds");
    }
  }

  return {
    matchday,
    baseSeed,
    clubIds: payload.clubIds,
    playerClubSquad,
  };
}

function squadsForMatchday(clubIds: TeamId[], playerClubSquad?: Squad): Squad[] {
  return clubIds.map((clubId) => {
    const template = ALL_LEAGUE_SQUADS.find((squad) => squad.team.id === clubId);
    if (!template) {
      throw new Error(`Unknown club for matchday: ${clubId}`);
    }
    if (playerClubSquad?.team.id === clubId) {
      return playerClubSquad;
    }
    return template;
  });
}

export function runMatchday(input: MatchdayInput) {
  const clubIds = input.clubIds ?? SEED_DIVISION.map((squad) => squad.team.id);
  const played = playMatchday({
    squads: squadsForMatchday(clubIds, input.playerClubSquad),
    matchday: input.matchday,
    baseSeed: input.baseSeed,
  });
  return {
    matchday: played.matchday,
    results: played.fixtures.map((fixture) => ({
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
    })),
    table: played.table,
    playerStats: played.playerStats,
  };
}
