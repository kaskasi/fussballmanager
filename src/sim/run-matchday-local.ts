import type { FixtureResult, PlayerSeasonStat, Squad } from "@fussballmanager/shared";

export type EngineMatchdayPayload = {
  results: FixtureResult[];
  playerStats: PlayerSeasonStat[];
};

/** Liga-Spieltag via Match-Engine im Client (PRD 17 — kein Worker-CPU). */
export async function runEngineMatchdayLocal(
  matchday: number,
  baseSeed: number,
  squads: readonly Squad[],
): Promise<EngineMatchdayPayload> {
  const { playMatchday } = await import("../../server/src/engine/matchday.ts");
  const played = playMatchday({
    squads,
    matchday,
    baseSeed,
  });
  return {
    results: played.fixtures.map((fixture) => ({
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
    })),
    playerStats: played.playerStats,
  };
}
