import {
  matchdayFixtures,
  mergePlayerSeasonStats,
  SEED_DIVISION,
  standings,
  topByStat,
  type FixtureResult,
  type PlayerSeasonStat,
  type ScheduledFixture,
  type TableRow,
  type TeamId,
} from "@fussballmanager/shared";
import type { PlayerRole, Squad } from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import {
  LEAGUE_MEETINGS_PER_OPPONENT,
  totalSeasonMatchdays,
  type LeagueState,
} from "../persistence/league-state.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";
import { pushWeeklyMinutes } from "../player/minute-history.ts";
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

export function leaguePlayerStats(league: LeagueState): PlayerSeasonStat[] {
  return league.player_stats ?? [];
}

export function topScorers(league: LeagueState, limit = 3): PlayerSeasonStat[] {
  return topByStat(leaguePlayerStats(league), "goals", limit);
}

export function topAssists(league: LeagueState, limit = 3): PlayerSeasonStat[] {
  return topByStat(leaguePlayerStats(league), "assists", limit);
}

export function topYellowCards(league: LeagueState, limit = 3): PlayerSeasonStat[] {
  return topByStat(leaguePlayerStats(league), "yellowCards", limit);
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

const SCORER_ROLES = new Set<PlayerRole>(["ST", "W", "AM", "CM"]);

function scorerPool(squad: Squad): PlayerSeasonStat[] {
  const outfield = squad.starters
    .map((place) => place.player)
    .filter((player) => SCORER_ROLES.has(player.role));
  const pool = outfield.length > 0 ? outfield : squad.starters.map((place) => place.player);
  return pool.map((player) => ({
    playerId: player.id,
    teamId: player.teamId,
    name: player.name,
    goals: 0,
    assists: 0,
    yellowCards: 0,
  }));
}

function simulateQuickPlayerStats(results: readonly FixtureResult[], baseSeed: number): PlayerSeasonStat[] {
  let stats: PlayerSeasonStat[] = [];
  for (let index = 0; index < results.length; index++) {
    const result = results[index]!;
    const homeSquad = SEED_DIVISION.find((entry) => entry.team.id === result.homeTeamId);
    const awaySquad = SEED_DIVISION.find((entry) => entry.team.id === result.awayTeamId);
    if (!homeSquad || !awaySquad) continue;

    let matchdayRows: PlayerSeasonStat[] = [];
    const addRows = (rows: PlayerSeasonStat[]) => {
      matchdayRows = mergePlayerSeasonStats(matchdayRows, rows);
    };
    const distribute = (squad: Squad, goals: number, salt: number) => {
      const pool = scorerPool(squad);
      for (let goal = 0; goal < goals; goal++) {
        const scorer = pool[Math.floor(seededRoll(baseSeed, salt + goal) * pool.length)] ?? pool[0];
        if (!scorer) continue;
        addRows([{ ...scorer, goals: 1, assists: 0, yellowCards: 0 }]);
        if (seededRoll(baseSeed, salt + goal + 50) < 0.62) {
          const assister = pool[Math.floor(seededRoll(baseSeed, salt + goal + 70) * pool.length)] ?? scorer;
          if (assister.playerId !== scorer.playerId) {
            addRows([{ ...assister, goals: 0, assists: 1, yellowCards: 0 }]);
          }
        }
      }
      const yellowCount = Math.floor(seededRoll(baseSeed, salt + 99) * 4);
      for (let card = 0; card < yellowCount; card++) {
        const offender = pool[Math.floor(seededRoll(baseSeed, salt + card + 120) * pool.length)] ?? pool[0];
        if (!offender) continue;
        addRows([{ ...offender, goals: 0, assists: 0, yellowCards: 1 }]);
      }
    };

    distribute(homeSquad, result.homeGoals, index * 10 + 1);
    distribute(awaySquad, result.awayGoals, index * 10 + 2);
    stats = mergePlayerSeasonStats(stats, matchdayRows);
  }
  return stats;
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

export interface MatchdayPayload {
  results: FixtureResult[];
  playerStats: PlayerSeasonStat[];
}

export async function fetchMatchdayPayload(matchday: number, baseSeed: number): Promise<MatchdayPayload> {
  try {
    const response = await fetch("/api/matchday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchday, baseSeed }),
    });
    if (!response.ok) {
      throw new Error(`matchday ${response.status}`);
    }
    const body = (await response.json()) as MatchdayPayload;
    return {
      results: body.results,
      playerStats: body.playerStats ?? [],
    };
  } catch {
    const clubIds = SEED_DIVISION.map((squad) => squad.team.id);
    const results = simulateQuickMatchday(matchday, baseSeed, clubIds);
    return {
      results,
      playerStats: simulateQuickPlayerStats(results, baseSeed),
    };
  }
}

export interface LeagueWeekAdvance {
  league: LeagueState;
  playerFixture: FixtureResult | null;
  matchdayPlayed: number;
  seasonComplete: boolean;
}

function normalizeLeague(league: LeagueState): LeagueState {
  return {
    ...league,
    meetings_per_opponent: league.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT,
    player_stats: league.player_stats ?? [],
    season_complete: league.season_complete ?? false,
  };
}

export async function advanceLeagueWeek(
  league: LeagueState,
  season: number,
  calendarWeek: number,
  masterSeed: number,
): Promise<LeagueWeekAdvance> {
  const current = normalizeLeague(league);

  if (!isLeagueMatchWeek(calendarWeek) || current.season_complete) {
    return {
      league: current,
      playerFixture: null,
      matchdayPlayed: 0,
      seasonComplete: current.season_complete ?? false,
    };
  }

  const maxMatchday = totalSeasonMatchdays(current);
  const matchdayPlayed = current.matchday;
  const baseSeed = weeklySeed(masterSeed, season, calendarWeek);
  const payload = await fetchMatchdayPayload(matchdayPlayed, baseSeed);
  const scheduled = playerFixture(current, matchdayPlayed);
  const playerResult = scheduled ? fixtureResult(payload.results, scheduled) ?? null : null;
  const seasonComplete = matchdayPlayed >= maxMatchday;

  return {
    league: {
      ...current,
      matchday: seasonComplete ? 1 : matchdayPlayed + 1,
      results: [...current.results, ...payload.results],
      player_stats: mergePlayerSeasonStats(current.player_stats, payload.playerStats),
      season_complete: seasonComplete,
    },
    playerFixture: playerResult,
    matchdayPlayed,
    seasonComplete,
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
    return pushWeeklyMinutes(player, minutes);
  });
}
