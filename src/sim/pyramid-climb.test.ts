import { describe, expect, it } from "vitest";
import { matchdayFixtures, standings, type FixtureResult, type TeamId } from "@fussballmanager/shared";
import { defaultLeagueState, totalSeasonMatchdays, type LeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "./league-divisions.ts";
import { bottomDivisionId, PYRAMID, pyramidDivisionIds } from "./league-pyramid.ts";
import {
  applyPromotionRelegation,
  divisionSeasonSeed,
  leagueStateAfterMovement,
  simulateDivisionMatchday,
} from "./promotion-relegation.ts";

/** A full season in which `winner` wins every match 3:0 and every other match ends 1:1. */
function forcedSeason(clubIds: readonly TeamId[], winner: TeamId): FixtureResult[] {
  const results: FixtureResult[] = [];
  const matchdays = totalSeasonMatchdays({ club_ids: [...clubIds], meetings_per_opponent: 2 });
  for (let matchday = 1; matchday <= matchdays; matchday++) {
    for (const fixture of matchdayFixtures(clubIds, matchday)) {
      const home = fixture.homeTeamId === winner ? 3 : fixture.awayTeamId === winner ? 0 : 1;
      const away = fixture.awayTeamId === winner ? 3 : fixture.homeTeamId === winner ? 0 : 1;
      results.push({ ...fixture, homeGoals: home, awayGoals: away });
    }
  }
  return results;
}

describe("PRD 32 acceptance: one save from Oberliga Nord to Meisterliga champion", () => {
  it("climbs every boundary and wins the top flight, with 18 clubs everywhere each season", () => {
    let pools = defaultLeaguePools();
    const club = pools[bottomDivisionId()][5]!;
    let league: LeagueState = {
      ...defaultLeagueState(),
      division_id: bottomDivisionId(),
      player_club_id: club,
      club_ids: [...pools[bottomDivisionId()]],
      league_pools: pools,
    };
    const visited: string[] = [league.division_id];
    for (let season = 1; season <= PYRAMID.length; season++) {
      league = { ...league, results: forcedSeason(league.club_ids, club), season_complete: true };
      const table = standings(league.club_ids, league.results);
      expect(table[0]!.teamId).toBe(club);
      if (league.division_id === pyramidDivisionIds()[0]) break;
      const outcome = applyPromotionRelegation(league, pools, 2026, season);
      expect(outcome.movements).toContainEqual(
        expect.objectContaining({ teamId: club, from: league.division_id, reason: "promoted" }),
      );
      pools = outcome.pools;
      for (const division of PYRAMID) expect(pools[division.id]).toHaveLength(division.clubCount);
      expect(new Set(Object.values(pools).flat()).size).toBe(PYRAMID.length * 18);
      league = leagueStateAfterMovement(league, pools, club);
      visited.push(league.division_id);
    }
    expect(visited).toEqual([...pyramidDivisionIds()].reverse());
  });

  it("reads a division's live results at season end instead of re-simulating it", () => {
    const pools = defaultLeaguePools();
    const league: LeagueState = { ...defaultLeagueState(), league_pools: pools, season_complete: true };
    const nationalliga = pools.nationalliga;
    const winner = nationalliga[10]!;
    const liveLeague: LeagueState = {
      ...league,
      results: forcedSeason(league.club_ids, league.club_ids[0]!),
      division_results: { nationalliga: forcedSeason(nationalliga, winner) },
    };
    const outcome = applyPromotionRelegation(liveLeague, pools, 7, 1);
    expect(outcome.movements).toContainEqual(
      expect.objectContaining({ teamId: winner, from: "nationalliga", to: "meisterliga-2", reason: "promoted" }),
    );
    // The Regionalliga champion goes up to the Nationalliga: the boundary is open.
    expect(outcome.movements).toContainEqual(
      expect.objectContaining({ teamId: league.club_ids[0], from: "regionalliga-nord", to: "nationalliga" }),
    );
  });

  it("plays the same quick-sim matchday for the same seed", () => {
    const ids = defaultLeaguePools().meisterliga;
    const seed = divisionSeasonSeed(2026, 3, "meisterliga");
    expect(simulateDivisionMatchday(ids, 4, seed)).toEqual(simulateDivisionMatchday(ids, 4, seed));
    expect(simulateDivisionMatchday(ids, 4, seed)).toHaveLength(9);
  });
});
