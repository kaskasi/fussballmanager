/**
 * PRD 32 §8 — one row per finished season: every division's final table,
 * champion and movements, the awards and the manager's season. Ids and
 * numbers only, so 20 seasons stay small. Phase 5 adds cups, phase 7 the UI.
 */
import { standings, type FixtureResult, type TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import { PYRAMID, type DivisionId } from "./league-pyramid.ts";
import type { PromotionRelegationResult } from "./promotion-relegation.ts";
import type { SeasonAwardsSnapshot } from "./season-awards.ts";

/** `[teamId, played, won, drawn, lost, goalsFor, goalsAgainst, points]`. */
export type ArchiveTableRow = [TeamId, number, number, number, number, number, number, number];
/** `[homeTeamId, awayTeamId, homeGoals, awayGoals]`. */
export type ArchiveResult = [TeamId, TeamId, number, number];

export interface ArchiveDivision {
  id: DivisionId;
  table: ArchiveTableRow[];
  champion: TeamId | null;
  promoted: TeamId[];
  relegated: TeamId[];
  /** `[home, away, homeGoals, awayGoals, winner]` of the playoff below this division. */
  playoff: [TeamId, TeamId, number, number, TeamId] | null;
}

export interface SeasonArchiveEntry {
  season: number;
  divisions: ArchiveDivision[];
  /** `[kind, playerId, clubId, value]`. */
  awards: [string, string, string, number][];
  own: { division: DivisionId; place: number; points: number; results: ArchiveResult[] };
}

function divisionResults(league: LeagueState, divisionId: DivisionId): FixtureResult[] {
  return divisionId === league.division_id ? league.results : (league.division_results?.[divisionId] ?? []);
}

/** Archive row for the season that just ended; `league` is its final state. */
export function seasonArchiveEntry(
  season: number,
  league: LeagueState,
  movement: Pick<PromotionRelegationResult, "movements" | "playoffs">,
  awards?: SeasonAwardsSnapshot,
): SeasonArchiveEntry {
  const divisions = PYRAMID.map((division): ArchiveDivision => {
    const clubIds = league.league_pools?.[division.id] ?? [];
    const results = divisionResults(league, division.id);
    const table = results.length > 0 ? standings(clubIds, results) : [];
    const playoff = movement.playoffs.find((match) => match.upperDivisionId === division.id);
    const out = (reasons: readonly string[]) =>
      movement.movements
        .filter((entry) => entry.from === division.id && reasons.includes(entry.reason))
        .map((entry) => entry.teamId);
    return {
      id: division.id,
      table: table.map((row) => [
        row.teamId,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.goalsFor,
        row.goalsAgainst,
        row.points,
      ]),
      champion: table[0]?.teamId ?? null,
      promoted: out(["promoted", "playoff_won"]),
      relegated: out(["relegated", "playoff_lost"]),
      playoff: playoff
        ? [playoff.homeTeamId, playoff.awayTeamId, playoff.homeGoals, playoff.awayGoals, playoff.winnerId]
        : null,
    };
  });
  const ownTable = standings(league.club_ids, league.results);
  const ownIndex = ownTable.findIndex((row) => row.teamId === league.player_club_id);
  const ownResults = league.results
    .filter((result) => result.homeTeamId === league.player_club_id || result.awayTeamId === league.player_club_id)
    .map((result): ArchiveResult => [result.homeTeamId, result.awayTeamId, result.homeGoals, result.awayGoals]);
  return {
    season,
    divisions,
    awards: (awards?.awards ?? []).map((card) => [card.kind, card.playerId, card.clubId, card.value]),
    own: {
      division: league.division_id,
      place: ownIndex + 1,
      points: ownTable[ownIndex]?.points ?? 0,
      results: ownResults,
    },
  };
}
