import {
  matchdayFixtures,
  standings,
  type FixtureResult,
  type TeamId,
} from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { totalSeasonMatchdays } from "../persistence/league-state.ts";
import { clubShortName } from "./league-week.ts";
import { squadForLeagueClub } from "./league-divisions.ts";
import { squadAverageStrength } from "@fussballmanager/shared";

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

function teamStrength(teamId: TeamId): number {
  const squad = squadForLeagueClub(teamId);
  return squad ? squadAverageStrength(squad) : 48;
}

function simulateMatchdayResults(
  clubIds: readonly TeamId[],
  matchday: number,
  baseSeed: number,
): FixtureResult[] {
  const fixtures = matchdayFixtures(clubIds, matchday);
  return fixtures.map((fixture, index) => {
    const homeStrength = teamStrength(fixture.homeTeamId);
    const awayStrength = teamStrength(fixture.awayTeamId);
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
): FixtureResult[] {
  const maxMatchdays = (clubIds.length - 1) * meetingsPerOpponent;
  const limit = Math.max(0, Math.min(matchdays, maxMatchdays));
  const results: FixtureResult[] = [];
  for (let matchday = 1; matchday <= limit; matchday++) {
    results.push(...simulateMatchdayResults(clubIds, matchday, baseSeed));
  }
  return results;
}

export function simulateFullDivisionSeason(
  clubIds: readonly TeamId[],
  meetingsPerOpponent: number,
  baseSeed: number,
): FixtureResult[] {
  const matchdays = (clubIds.length - 1) * meetingsPerOpponent;
  return simulatePartialDivisionSeason(clubIds, meetingsPerOpponent, matchdays, baseSeed);
}

function simulatePlayoffMatch(homeTeamId: TeamId, awayTeamId: TeamId, seed: number): FixtureResult {
  const homeStrength = teamStrength(homeTeamId);
  const awayStrength = teamStrength(awayTeamId);
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

export function applyPromotionRelegation(
  league: LeagueState,
  pools: Record<DivisionEconomyId, TeamId[]>,
  masterSeed: number,
  season: number,
): PromotionRelegationResult {
  const regionalligaId = "regionalliga-nord";
  const oberligaId = "oberliga-nord";
  const regIds = [...pools[regionalligaId]];
  const oberIds = [...pools[oberligaId]];
  const meetings = league.meetings_per_opponent;

  const regResults =
    league.division_id === regionalligaId
      ? league.results
      : simulateFullDivisionSeason(regIds, meetings, masterSeed ^ season ^ 11);
  const oberResults =
    league.division_id === oberligaId
      ? league.results
      : simulateFullDivisionSeason(oberIds, meetings, masterSeed ^ season ^ 29);

  const regTable = standings(regIds, regResults);
  const oberTable = standings(oberIds, oberResults);
  const regChampion = regTable[0]?.teamId;
  const regRelegated = regTable[regTable.length - 1]?.teamId;
  const regPlayoff = regTable[regTable.length - 2]?.teamId;
  const oberChampion = oberTable[0]?.teamId;
  const oberPlayoff = oberTable[1]?.teamId;

  const nextPools: Record<DivisionEconomyId, TeamId[]> = {
    [regionalligaId]: [...regIds],
    [oberligaId]: [...oberIds],
  };
  const movements: PromotionMovement[] = [];
  const messages: string[] = [];

  if (regRelegated && oberChampion) {
    swapClub(nextPools, regionalligaId, oberligaId, regRelegated, oberChampion);
    movements.push(
      { teamId: oberChampion, from: oberligaId, to: regionalligaId, reason: "promoted" },
      { teamId: regRelegated!, from: regionalligaId, to: oberligaId, reason: "relegated" },
    );
    messages.push(
      `⬆️ ${clubShortName(oberChampion)} steigt auf`,
      `⬇️ ${clubShortName(regRelegated!)} steigt ab`,
    );
  }

  let playoff: PromotionRelegationResult["playoff"];
  if (regPlayoff && oberPlayoff) {
    const playoffMatch = simulatePlayoffMatch(regPlayoff, oberPlayoff, masterSeed ^ season ^ 71);
    const winnerId =
      playoffMatch.homeGoals >= playoffMatch.awayGoals
        ? playoffMatch.homeTeamId
        : playoffMatch.awayTeamId;
    if (winnerId === oberPlayoff) {
      swapClub(nextPools, regionalligaId, oberligaId, regPlayoff, oberPlayoff);
      movements.push(
        { teamId: oberPlayoff, from: oberligaId, to: regionalligaId, reason: "playoff_won" },
        { teamId: regPlayoff, from: regionalligaId, to: oberligaId, reason: "playoff_lost" },
      );
    }
    playoff = {
      homeTeamId: playoffMatch.homeTeamId,
      awayTeamId: playoffMatch.awayTeamId,
      homeGoals: playoffMatch.homeGoals,
      awayGoals: playoffMatch.awayGoals,
      winnerId,
    };
    messages.push(
      `🎯 Relegation: ${clubShortName(playoffMatch.homeTeamId)} ${playoffMatch.homeGoals}:${playoffMatch.awayGoals} ${clubShortName(playoffMatch.awayTeamId)}`,
    );
  }

  return { pools: nextPools, movements, playoff, messages };
}

function swapClub(
  pools: Record<DivisionEconomyId, TeamId[]>,
  upperId: DivisionEconomyId,
  lowerId: DivisionEconomyId,
  upperTeamId: TeamId | undefined,
  lowerTeamId: TeamId | undefined,
): void {
  if (!upperTeamId || !lowerTeamId) return;
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
  const playerDivision = (["regionalliga-nord", "oberliga-nord"] as const).find((divisionId) =>
    pools[divisionId]?.includes(playerClubId),
  );
  const division_id = playerDivision ?? league.division_id;
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
