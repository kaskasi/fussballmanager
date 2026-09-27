import {
  assertValidSquad,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { playMatchday } from "../engine/matchday.ts";

export interface MatchdayInput {
  matchday: number;
  baseSeed: number;
  clubIds: TeamId[];
  squads: Squad[];
  playerClubSquad?: Squad;
}

export function parseMatchdayBody(body: unknown): MatchdayInput {
  const payload = body as {
    matchday?: number;
    baseSeed?: number;
    clubIds?: TeamId[];
    squads?: Squad[];
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

  const squads = payload.squads ?? [];
  const clubIds = payload.clubIds ?? squads.map((squad) => squad.team.id);
  if (clubIds.length < 2 || clubIds.length % 2 !== 0) {
    throw new Error("clubIds must contain an even division");
  }
  if (squads.length !== clubIds.length) {
    throw new Error("squads must contain one entry per clubId");
  }
  for (const squad of squads) {
    assertValidSquad(squad);
    if (!clubIds.includes(squad.team.id)) {
      throw new Error(`Squad ${squad.team.id} is not present in clubIds`);
    }
  }

  const playerClubSquad = payload.playerClubSquad;
  if (playerClubSquad) {
    assertValidSquad(playerClubSquad);
    if (!clubIds.includes(playerClubSquad.team.id)) {
      throw new Error("playerClubSquad must belong to a club in clubIds");
    }
  }

  return {
    matchday,
    baseSeed,
    clubIds,
    squads,
    playerClubSquad,
  };
}

function squadsForMatchday(input: MatchdayInput): Squad[] {
  const byTeam = new Map(input.squads.map((squad) => [squad.team.id, squad] as const));
  return input.clubIds.map((clubId) => {
    const template = byTeam.get(clubId);
    if (!template) {
      throw new Error(`Unknown club for matchday: ${clubId}`);
    }
    if (input.playerClubSquad?.team.id === clubId) {
      return input.playerClubSquad;
    }
    return template;
  });
}

export function runMatchday(input: MatchdayInput) {
  const played = playMatchday({
    squads: squadsForMatchday(input),
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
