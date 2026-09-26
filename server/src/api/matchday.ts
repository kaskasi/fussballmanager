import { SEED_DIVISION } from "@fussballmanager/shared";
import { playMatchday } from "../engine/matchday.ts";

export function parseMatchdayBody(body: unknown): { matchday: number; baseSeed: number } {
  const payload = body as { matchday?: number; baseSeed?: number };
  const matchday = Number(payload.matchday ?? 1);
  const baseSeed = Number(payload.baseSeed ?? 2026);
  if (!Number.isFinite(matchday) || matchday < 1) {
    throw new Error("matchday must be >= 1");
  }
  if (!Number.isFinite(baseSeed)) {
    throw new Error("baseSeed must be a number");
  }
  return { matchday, baseSeed };
}

export function runMatchday(input: { matchday: number; baseSeed: number }) {
  const played = playMatchday({
    squads: SEED_DIVISION,
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
