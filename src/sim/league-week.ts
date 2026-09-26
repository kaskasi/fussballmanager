import {
  matchdayFixtures,
  SEED_DIVISION,
  standings,
  type FixtureResult,
  type ScheduledFixture,
  type TableRow,
  type TeamId,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import type { Player } from "../types/player.ts";

export function weeklySeed(masterSeed: number, season: number, week: number): number {
  let hash = masterSeed ^ season ^ week;
  hash = Math.imul(hash ^ 0x9e3779b1, 0x85ebca6b);
  return hash >>> 0;
}

export function clubShortName(clubId: TeamId): string {
  const squad = SEED_DIVISION.find((entry) => entry.team.id === clubId);
  return squad?.team.shortName ?? clubId;
}

export function playerFixture(
  league: LeagueState,
  matchday: number,
): ScheduledFixture | undefined {
  return matchdayFixtures(league.club_ids, matchday).find(
    (fixture) =>
      fixture.homeTeamId === league.player_club_id || fixture.awayTeamId === league.player_club_id,
  );
}

export function fixtureResult(
  results: readonly FixtureResult[],
  fixture: ScheduledFixture,
): FixtureResult | undefined {
  return results.find(
    (result) =>
      result.homeTeamId === fixture.homeTeamId && result.awayTeamId === fixture.awayTeamId,
  );
}

export function leagueTable(league: LeagueState): TableRow[] {
  return standings(league.club_ids, league.results);
}

export function playerTableRow(league: LeagueState): TableRow | undefined {
  return leagueTable(league).find((row) => row.teamId === league.player_club_id);
}

export function formatFixtureResult(
  result: FixtureResult,
  playerClubId: TeamId,
): string {
  const home = clubShortName(result.homeTeamId);
  const away = clubShortName(result.awayTeamId);
  const score = `${result.homeGoals}:${result.awayGoals}`;
  if (result.homeTeamId === playerClubId) return `${score} vs ${away} (H)`;
  if (result.awayTeamId === playerClubId) return `${score} vs ${home} (A)`;
  return `${home} ${score} ${away}`;
}

export function lastPlayerResult(league: LeagueState): FixtureResult | undefined {
  for (let index = league.results.length - 1; index >= 0; index--) {
    const result = league.results[index];
    if (!result) continue;
    if (result.homeTeamId === league.player_club_id || result.awayTeamId === league.player_club_id) {
      return result;
    }
  }
  return undefined;
}

function teamStrength(teamId: TeamId): number {
  const squad = SEED_DIVISION.find((entry) => entry.team.id === teamId);
  if (!squad) return 50;
  const ratings = squad.starters.map((place) => {
    const attrs = place.player.attributes;
    return (
      attrs.passing +
      attrs.tackling +
      attrs.shooting +
      attrs.pace +
      attrs.stamina +
      attrs.positioning
    ) / 6;
  });
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}

function seededRoll(baseSeed: number, salt: number): number {
  let hash = baseSeed ^ salt;
  hash = Math.imul(hash ^ 0x517cc1b7, 0x9e3779b1);
  return ((hash >>> 0) % 10_000) / 10_000;
}

/** Deterministic fallback when the matchday API is offline. */
export function simulateQuickMatchday(
  matchday: number,
  baseSeed: number,
  clubIds: readonly TeamId[],
): FixtureResult[] {
  const fixtures = matchdayFixtures(clubIds, matchday);
  return fixtures.map((fixture, index) => {
    const homeStrength = teamStrength(fixture.homeTeamId);
    const awayStrength = teamStrength(fixture.awayTeamId);
    const edge = (homeStrength - awayStrength) / 20;
    const homeGoals = Math.min(
      5,
      Math.max(0, Math.round(seededRoll(baseSeed, index) * 2.8 + 1 + edge)),
    );
    const awayGoals = Math.min(
      5,
      Math.max(0, Math.round(seededRoll(baseSeed, index + 17) * 2.8 + edge * -0.5)),
    );
    return {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeGoals,
      awayGoals,
    };
  });
}

export async function fetchMatchdayResults(
  matchday: number,
  baseSeed: number,
): Promise<FixtureResult[]> {
  try {
    const response = await fetch("/api/matchday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchday, baseSeed }),
    });
    if (!response.ok) {
      throw new Error(`matchday ${response.status}`);
    }
    const body = (await response.json()) as { results: FixtureResult[] };
    return body.results;
  } catch {
    return simulateQuickMatchday(matchday, baseSeed, SEED_DIVISION.map((squad) => squad.team.id));
  }
}

export interface LeagueWeekAdvance {
  league: LeagueState;
  playerFixture: FixtureResult | null;
  matchdayPlayed: number;
}

export async function advanceLeagueWeek(
  league: LeagueState,
  season: number,
  week: number,
  masterSeed: number,
): Promise<LeagueWeekAdvance> {
  const matchdayPlayed = league.matchday;
  const baseSeed = weeklySeed(masterSeed, season, week);
  const results = await fetchMatchdayResults(matchdayPlayed, baseSeed);
  const scheduled = playerFixture(league, matchdayPlayed);
  const playerResult = scheduled ? fixtureResult(results, scheduled) ?? null : null;
  const maxMatchday = league.club_ids.length - 1;

  return {
    league: {
      ...league,
      matchday: matchdayPlayed >= maxMatchday ? 1 : matchdayPlayed + 1,
      results: [...league.results, ...results],
    },
    playerFixture: playerResult,
    matchdayPlayed,
  };
}

export function applyProMatchMinutes(
  players: readonly Player[],
  fixture: FixtureResult | null,
  playerClubEngineId: TeamId,
): Player[] {
  if (!fixture) return [...players];
  const played =
    fixture.homeTeamId === playerClubEngineId || fixture.awayTeamId === playerClubEngineId;
  if (!played) return [...players];

  return players.map((player) => {
    if (player.club_id !== DEFAULT_CLUB_ID) return player;
    if (player.squad_status !== "pro") return player;
    const minutes = 55 + (player.portrait_seed % 36);
    return {
      ...player,
      state: {
        ...player.state,
        weekly_minutes: minutes,
        season_minutes: player.state.season_minutes + minutes,
      },
    };
  });
}
