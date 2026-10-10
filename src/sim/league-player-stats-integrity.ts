import type { FixtureResult, PlayerSeasonStat } from "@fussballmanager/shared";

export interface FixtureStatMismatch {
  homeTeamId: string;
  awayTeamId: string;
  field: "homeGoals" | "awayGoals";
  expected: number;
  actual: number;
}

/** Engine event stats must sum to the fixture score for each side. */
export function fixtureStatMismatches(
  results: readonly FixtureResult[],
  stats: readonly PlayerSeasonStat[],
): FixtureStatMismatch[] {
  const mismatches: FixtureStatMismatch[] = [];
  for (const result of results) {
    let homeGoals = 0;
    let awayGoals = 0;
    for (const row of stats) {
      if (row.teamId !== result.homeTeamId && row.teamId !== result.awayTeamId) continue;
      if (row.teamId === result.homeTeamId) homeGoals += row.goals;
      if (row.teamId === result.awayTeamId) awayGoals += row.goals;
    }
    if (homeGoals !== result.homeGoals) {
      mismatches.push({
        homeTeamId: result.homeTeamId,
        awayTeamId: result.awayTeamId,
        field: "homeGoals",
        expected: result.homeGoals,
        actual: homeGoals,
      });
    }
    if (awayGoals !== result.awayGoals) {
      mismatches.push({
        homeTeamId: result.homeTeamId,
        awayTeamId: result.awayTeamId,
        field: "awayGoals",
        expected: result.awayGoals,
        actual: awayGoals,
      });
    }
  }
  return mismatches;
}

export function assertFixtureStatsConsistent(
  results: readonly FixtureResult[],
  stats: readonly PlayerSeasonStat[],
): void {
  const mismatches = fixtureStatMismatches(results, stats);
  if (mismatches.length === 0) return;
  const sample = mismatches[0]!;
  throw new Error(
    `Player stats do not match fixture score (${sample.homeTeamId} vs ${sample.awayTeamId}: ${sample.field} expected ${sample.expected}, got ${sample.actual})`,
  );
}
