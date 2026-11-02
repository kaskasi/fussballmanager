/**
 * PRD 32 §7 — the quick strength model for divisions the manager is not in:
 * one matchday per league week, and the season-end batch for leagues without
 * live results. No player stats.
 */
import { matchdayFixtures, squadAverageStrength, type FixtureResult, type TeamId } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { squadForLeagueClub } from "./league-divisions.ts";
import { pyramidDivision, type DivisionId } from "./league-pyramid.ts";

export function seededRoll(seed: number, salt: number): number {
  let hash = seed ^ salt;
  hash = Math.imul(hash ^ 0x517cc1b7, 0x9e3779b1);
  return ((hash >>> 0) % 10_000) / 10_000;
}

export function teamStrength(teamId: TeamId, rivalPlayers?: readonly Player[]): number {
  const squad = squadForLeagueClub(teamId, rivalPlayers);
  return squad ? squadAverageStrength(squad) : 48;
}

/**
 * PRD 32 §7 — seed of a division's quick-sim season when the manager is not in
 * it. The weekly live matchday and the season-end fallback share it, so both
 * give the same results for the same rosters.
 */
export function divisionSeasonSeed(masterSeed: number, season: number, divisionId: DivisionId): number {
  return masterSeed ^ season ^ pyramidDivision(divisionId).simSalt;
}

/** One quick-sim matchday of a division (strength model, no player stats). */
export function simulateDivisionMatchday(
  clubIds: readonly TeamId[],
  matchday: number,
  baseSeed: number,
  rivalPlayers?: readonly Player[],
): FixtureResult[] {
  const fixtures = matchdayFixtures(clubIds, matchday);
  return fixtures.map((fixture, index) => {
    const homeStrength = teamStrength(fixture.homeTeamId, rivalPlayers);
    const awayStrength = teamStrength(fixture.awayTeamId, rivalPlayers);
    const edge = (homeStrength - awayStrength) / 20;
    const homeGoals = Math.min(
      5,
      Math.max(0, Math.round(1.1 + edge + seededRoll(baseSeed, matchday * 17 + index) * 2.4)),
    );
    const awayGoals = Math.min(
      5,
      Math.max(0, Math.round(1.0 - edge * 0.6 + seededRoll(baseSeed, matchday * 19 + index + 3) * 2.2)),
    );
    return {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeGoals,
      awayGoals,
    };
  });
}

export function simulatePartialDivisionSeason(
  clubIds: readonly TeamId[],
  meetingsPerOpponent: number,
  matchdays: number,
  baseSeed: number,
  rivalPlayers?: readonly Player[],
): FixtureResult[] {
  const maxMatchdays = (clubIds.length - 1) * meetingsPerOpponent;
  const limit = Math.max(0, Math.min(matchdays, maxMatchdays));
  const results: FixtureResult[] = [];
  for (let matchday = 1; matchday <= limit; matchday++) {
    results.push(...simulateDivisionMatchday(clubIds, matchday, baseSeed, rivalPlayers));
  }
  return results;
}

export function simulateFullDivisionSeason(
  clubIds: readonly TeamId[],
  meetingsPerOpponent: number,
  baseSeed: number,
  rivalPlayers?: readonly Player[],
): FixtureResult[] {
  const matchdays = (clubIds.length - 1) * meetingsPerOpponent;
  return simulatePartialDivisionSeason(clubIds, meetingsPerOpponent, matchdays, baseSeed, rivalPlayers);
}
