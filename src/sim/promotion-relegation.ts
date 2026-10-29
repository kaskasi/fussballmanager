import {
  matchdayFixtures,
  standings,
  type FixtureResult,
  type TeamId,
} from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { totalSeasonMatchdays } from "../persistence/league-state.ts";
import { t } from "../i18n/index.ts";
import { clubShortName } from "./league-week.ts";
import { divisionLabel, squadForLeagueClub } from "./league-divisions.ts";
import { divisionBelow, divisionOfClub, emptyDivisionPools, PYRAMID, type DivisionId } from "./league-pyramid.ts";
import { squadAverageStrength } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";

export interface PromotionMovement {
  teamId: TeamId;
  from: DivisionEconomyId;
  to: DivisionEconomyId;
  reason: "promoted" | "relegated" | "playoff_won" | "playoff_lost";
}

export interface PromotionRelegationResult {
  pools: Record<DivisionEconomyId, TeamId[]>;
  movements: PromotionMovement[];
  playoff?: {
    homeTeamId: TeamId;
    awayTeamId: TeamId;
    homeGoals: number;
    awayGoals: number;
    winnerId: TeamId;
  };
  messages: string[];
}

function seededRoll(seed: number, salt: number): number {
  let hash = seed ^ salt;
  hash = Math.imul(hash ^ 0x517cc1b7, 0x9e3779b1);
  return ((hash >>> 0) % 10_000) / 10_000;
}

function teamStrength(teamId: TeamId, rivalPlayers?: readonly Player[]): number {
  const squad = squadForLeagueClub(teamId, rivalPlayers);
  return squad ? squadAverageStrength(squad) : 48;
}

function simulateMatchdayResults(
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
    results.push(...simulateMatchdayResults(clubIds, matchday, baseSeed, rivalPlayers));
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

function simulatePlayoffMatch(
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  seed: number,
  rivalPlayers?: readonly Player[],
): FixtureResult {
  const homeStrength = teamStrength(homeTeamId, rivalPlayers);
  const awayStrength = teamStrength(awayTeamId, rivalPlayers);
  const edge = (homeStrength - awayStrength) / 18;
  const homeGoals = Math.min(
    4,
    Math.max(0, Math.round(1.2 + edge + seededRoll(seed, 91) * 2)),
  );
  const awayGoals = Math.min(
    4,
    Math.max(0, Math.round(0.9 - edge * 0.5 + seededRoll(seed, 93) * 2)),
  );
  return { homeTeamId, awayTeamId, homeGoals, awayGoals };
}

/** Final table order of every division: the player's from its results, the rest batch-simulated. */
function finalTables(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  masterSeed: number,
  season: number,
  rivalPlayers?: readonly Player[],
): Map<DivisionId, TeamId[]> {
  const tables = new Map<DivisionId, TeamId[]>();
  for (const division of PYRAMID) {
    const ids = [...(pools[division.id] ?? [])];
    const results =
      league.division_id === division.id
        ? league.results
        : simulateFullDivisionSeason(
            ids,
            league.meetings_per_opponent,
            masterSeed ^ season ^ division.simSalt,
            rivalPlayers,
          );
    tables.set(division.id, standings(ids, results).map((row) => row.teamId));
  }
  return tables;
}

/**
 * PRD 32 §3 — season-end movements over every boundary of the pyramid, top
 * to bottom, from final tables: `direct` clubs swap places, then the playoff
 * (first place above the drop zone at home vs first place below the direct
 * promotion places). A club sits in exactly one boundary per season.
 */
export function applyPromotionRelegation(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  masterSeed: number,
  season: number,
  rivalPlayers?: readonly Player[],
): PromotionRelegationResult {
  const tables = finalTables(league, pools, masterSeed, season, rivalPlayers);
  const nextPools = emptyDivisionPools<TeamId>();
  for (const division of PYRAMID) nextPools[division.id] = [...(pools[division.id] ?? [])];
  const movements: PromotionMovement[] = [];
  const messages: string[] = [];
  let playoff: PromotionRelegationResult["playoff"];

  for (const division of PYRAMID) {
    const boundary = division.boundaryBelow;
    const upperId = division.id;
    const lowerId = divisionBelow(upperId);
    if (!boundary || !lowerId) continue;
    const upperTable = tables.get(upperId) ?? [];
    const lowerTable = tables.get(lowerId) ?? [];

    for (let slot = 0; slot < boundary.direct; slot++) {
      const relegated = upperTable[upperTable.length - 1 - slot];
      const promoted = lowerTable[slot];
      if (!relegated || !promoted) continue;
      swapClub(nextPools, upperId, lowerId, relegated, promoted);
      movements.push(
        { teamId: promoted, from: lowerId, to: upperId, reason: "promoted" },
        { teamId: relegated, from: upperId, to: lowerId, reason: "relegated" },
      );
      messages.push(
        t("clubEvent.promoted", { club: clubShortName(promoted), division: divisionLabel(upperId) }),
        t("clubEvent.relegated", { club: clubShortName(relegated), division: divisionLabel(lowerId) }),
      );
    }

    if (!boundary.playoff) continue;
    const upperPlayoff = upperTable[upperTable.length - 1 - boundary.direct];
    const lowerPlayoff = lowerTable[boundary.direct];
    if (!upperPlayoff || !lowerPlayoff) continue;
    const match = simulatePlayoffMatch(
      upperPlayoff,
      lowerPlayoff,
      masterSeed ^ season ^ boundary.playoffSalt,
      rivalPlayers,
    );
    const winnerId = match.homeGoals >= match.awayGoals ? match.homeTeamId : match.awayTeamId;
    if (winnerId === lowerPlayoff) {
      swapClub(nextPools, upperId, lowerId, upperPlayoff, lowerPlayoff);
      movements.push(
        { teamId: lowerPlayoff, from: lowerId, to: upperId, reason: "playoff_won" },
        { teamId: upperPlayoff, from: upperId, to: lowerId, reason: "playoff_lost" },
      );
    }
    // The result keeps one playoff (the player's tiers have one boundary until PRD 32 slice 3).
    playoff ??= { ...match, winnerId };
    messages.push(
      t("clubEvent.playoff", {
        home: clubShortName(match.homeTeamId),
        away: clubShortName(match.awayTeamId),
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      }),
    );
  }

  return { pools: nextPools, movements, playoff, messages };
}

function swapClub(
  pools: Record<DivisionEconomyId, TeamId[]>,
  upperId: DivisionEconomyId,
  lowerId: DivisionEconomyId,
  upperTeamId: TeamId,
  lowerTeamId: TeamId,
): void {
  const upper = pools[upperId];
  const lower = pools[lowerId];
  const upperIndex = upper.indexOf(upperTeamId);
  const lowerIndex = lower.indexOf(lowerTeamId);
  if (upperIndex < 0 || lowerIndex < 0) return;
  upper[upperIndex] = lowerTeamId;
  lower[lowerIndex] = upperTeamId;
}

export function leagueStateAfterMovement(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  playerClubId: TeamId,
): LeagueState {
  const division_id = divisionOfClub(pools, playerClubId) ?? league.division_id;
  return {
    ...league,
    division_id,
    league_pools: pools,
    club_ids: [...(pools[division_id] ?? league.club_ids)],
  };
}

export function promotionZoneRank(index: number, teamCount: number): "promoted" | "playoff" | "safe" | "relegated" | null {
  if (index === 0) return "promoted";
  if (index === 1) return "playoff";
  if (index === teamCount - 1) return "relegated";
  if (index === teamCount - 2) return "playoff";
  return "safe";
}
