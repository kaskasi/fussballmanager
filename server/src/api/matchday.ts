import {
  assertValidSquad,
  NORDSTERN_ID,
  SEED_DIVISION,
  type Squad,
} from "@fussballmanager/shared";
import { playMatchday } from "../engine/matchday.ts";

export interface MatchdayInput {
  matchday: number;
  baseSeed: number;
  playerClubSquad?: Squad;
}

export function parseMatchdayBody(body: unknown): MatchdayInput {
  const payload = body as {
    matchday?: number;
    baseSeed?: number;
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
    if (playerClubSquad.team.id !== NORDSTERN_ID) {
      throw new Error("playerClubSquad must belong to the player club");
    }
  }

  return { matchday, baseSeed, playerClubSquad };
}

function squadsForMatchday(playerClubSquad?: Squad) {
  if (!playerClubSquad) return [...SEED_DIVISION];
  return SEED_DIVISION.map((squad) =>
    squad.team.id === playerClubSquad.team.id ? playerClubSquad : squad,
  );
}

export function runMatchday(input: MatchdayInput) {
  const played = playMatchday({
    squads: squadsForMatchday(input.playerClubSquad),
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
