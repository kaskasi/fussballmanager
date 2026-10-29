import {
  standings,
  topByStat,
  topDiscipline as topDisciplineFromStats,
  type FixtureResult,
  type PlayerSeasonStat,
  type TableRow,
  type TeamId,
} from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { totalSeasonMatchdays } from "../persistence/league-state.ts";
import { clubIdsForDivision, defaultLeaguePools } from "./league-divisions.ts";
import {
  playerStatsFromResults,
  topAssists,
  topDisciplinePlayers,
  topScorers,
  topYellowCards,
} from "./league-week.ts";
import { simulatePartialDivisionSeason } from "./promotion-relegation.ts";
import type { Player } from "../types/player.ts";
import { pyramidDivision } from "./league-pyramid.ts";

export interface DivisionStandings {
  divisionId: DivisionEconomyId;
  clubIds: TeamId[];
  results: FixtureResult[];
  table: TableRow[];
  simulated: boolean;
  matchdaysPlayed: number;
}

function divisionSeed(masterSeed: number, season: number, divisionId: DivisionEconomyId): number {
  return (masterSeed ^ season ^ pyramidDivision(divisionId).tableSalt) >>> 0;
}

export function divisionStandings(
  league: LeagueState,
  divisionId: DivisionEconomyId,
  masterSeed: number,
  season: number,
  rivalPlayers: readonly Player[] = [],
): DivisionStandings {
  const pools = league.league_pools ?? defaultLeaguePools();
  const clubIds = clubIdsForDivision(pools, divisionId);
  const meetings = league.meetings_per_opponent;
  const maxMatchdays = totalSeasonMatchdays({ club_ids: clubIds, meetings_per_opponent: meetings });
  const matchdaysPlayed = league.season_complete
    ? maxMatchdays
    : Math.max(0, Math.min(maxMatchdays, league.matchday - 1));

  if (divisionId === league.division_id) {
    return {
      divisionId,
      clubIds,
      results: league.results,
      table: standings(clubIds, league.results),
      simulated: false,
      matchdaysPlayed,
    };
  }

  const results =
    matchdaysPlayed > 0
      ? simulatePartialDivisionSeason(
          clubIds,
          meetings,
          matchdaysPlayed,
          divisionSeed(masterSeed, season, divisionId),
          rivalPlayers,
        )
      : [];

  return {
    divisionId,
    clubIds,
    results,
    table: standings(clubIds, results),
    simulated: true,
    matchdaysPlayed,
  };
}

export function leagueSliceForForm(
  clubIds: readonly TeamId[],
  results: readonly FixtureResult[],
): Pick<LeagueState, "club_ids" | "results"> {
  return {
    club_ids: [...clubIds],
    results: [...results],
  };
}

export interface DivisionLeaderLists {
  scorers: PlayerSeasonStat[];
  assists: PlayerSeasonStat[];
  yellows: PlayerSeasonStat[];
  discipline: PlayerSeasonStat[];
}

export function divisionLeaderLists(
  league: LeagueState,
  standings: DivisionStandings,
  masterSeed: number,
  season: number,
  rivalPlayers: readonly Player[] = [],
  limit = 3,
): DivisionLeaderLists {
  if (!standings.simulated) {
    return {
      scorers: topScorers(league, limit),
      assists: topAssists(league, limit),
      yellows: topYellowCards(league, limit),
      discipline: topDisciplinePlayers(league, limit),
    };
  }

  const stats = playerStatsFromResults(
    standings.results,
    divisionSeed(masterSeed, season, standings.divisionId),
    undefined,
    rivalPlayers,
  );
  return {
    scorers: topByStat(stats, "goals", limit),
    assists: topByStat(stats, "assists", limit),
    yellows: topByStat(stats, "yellowCards", limit),
    discipline: topDisciplineFromStats(stats, limit),
  };
}
