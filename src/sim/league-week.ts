import {
  asPlayerId,
  matchdayFixtures,
  mergePlayerSeasonStats,
  squadAverageStrength,
  standings,
  topByStat,
  topDiscipline as rankDiscipline,
  type FixtureResult,
  type PlayerSeasonStat,
  type ScheduledFixture,
  type Squad,
  type TableRow,
  type TeamId,
} from "@fussballmanager/shared";
import type { PlayerRole } from "@fussballmanager/shared";
import {
  normalizeLeagueState,
  totalSeasonMatchdays,
  type LeagueState,
} from "../persistence/league-state.ts";
import type { Player } from "../types/player.ts";
import { careerEngineSquadFromPlayers } from "./career-engine-squad.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";
import { clubShortLabel, squadForLeagueClub } from "./league-divisions.ts";
import type { WorldClub } from "../world/world-generator.ts";
import type { WatchedPlayerMatch } from "./watched-player-match.ts";

export function weeklySeed(masterSeed: number, season: number, week: number): number {
  let hash = masterSeed ^ season ^ week;
  hash = Math.imul(hash ^ 0x9e3779b1, 0x85ebca6b);
  return hash >>> 0;
}

export function clubShortName(clubId: TeamId, worldClubs?: readonly WorldClub[]): string {
  return clubShortLabel(clubId, worldClubs);
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
  const engine = (league.player_stats ?? []).filter((row) => row.teamId !== league.player_club_id);
  const career = (league.career_player_stats ?? []).map((row) => ({
    playerId: asPlayerId(row.playerId),
    teamId: league.player_club_id,
    name: row.name,
    goals: row.goals,
    assists: row.assists,
    yellowCards: row.yellowCards,
    redCards: 0,
  }));
  return mergePlayerSeasonStats(engine, career);
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

export function topDisciplinePlayers(league: LeagueState, limit = 3): PlayerSeasonStat[] {
  return rankDiscipline(leaguePlayerStats(league), limit);
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

function teamStrength(
  teamId: TeamId,
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): number {
  if (playerClubSquad && teamId === playerClubSquad.team.id) {
    return squadAverageStrength(playerClubSquad);
  }
  const squad = squadForTeam(teamId, playerClubSquad, rivalPlayers);
  if (!squad) return 48;
  return squadAverageStrength(squad);
}

function squadForTeam(
  teamId: TeamId,
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): Squad | undefined {
  if (playerClubSquad && teamId === playerClubSquad.team.id) {
    return playerClubSquad;
  }
  return squadForLeagueClub(teamId, rivalPlayers);
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

export function playerStatsFromResults(
  results: readonly FixtureResult[],
  baseSeed: number,
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): PlayerSeasonStat[] {
  return simulateQuickPlayerStats(results, baseSeed, playerClubSquad, rivalPlayers);
}

function simulateQuickPlayerStats(
  results: readonly FixtureResult[],
  baseSeed: number,
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): PlayerSeasonStat[] {
  let stats: PlayerSeasonStat[] = [];
  for (let index = 0; index < results.length; index++) {
    const result = results[index]!;
    const homeSquad = squadForTeam(result.homeTeamId, playerClubSquad, rivalPlayers);
    const awaySquad = squadForTeam(result.awayTeamId, playerClubSquad, rivalPlayers);
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
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): FixtureResult[] {
  const fixtures = matchdayFixtures(clubIds, matchday);
  return fixtures.map((fixture, index) => {
    const homeStrength = teamStrength(fixture.homeTeamId, playerClubSquad, rivalPlayers);
    const awayStrength = teamStrength(fixture.awayTeamId, playerClubSquad, rivalPlayers);
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

export async function fetchMatchdayPayload(
  matchday: number,
  baseSeed: number,
  clubIds: readonly TeamId[],
  playerClubSquad?: Squad,
  rivalPlayers?: readonly Player[],
): Promise<MatchdayPayload> {
  const squads = clubIds.map((teamId) =>
    squadForTeam(teamId, playerClubSquad, rivalPlayers),
  );
  if (squads.some((squad) => squad === undefined)) {
    throw new Error("Generated league squad is missing");
  }
  const { runEngineMatchdayLocal } = await import("./run-matchday-local.ts");
  return runEngineMatchdayLocal(matchday, baseSeed, squads as Squad[]);
}

export interface LeagueWeekAdvance {
  league: LeagueState;
  playerFixture: FixtureResult | null;
  matchdayPlayed: number;
  seasonComplete: boolean;
  clubPlayerStats: PlayerSeasonStat[];
}

function applyWatchedPlayerFixture(
  payload: MatchdayPayload,
  scheduled: ScheduledFixture,
  watched: WatchedPlayerMatch,
  playerClubId: TeamId,
): MatchdayPayload {
  const override: FixtureResult = {
    homeTeamId: watched.homeTeamId,
    awayTeamId: watched.awayTeamId,
    homeGoals: watched.homeGoals,
    awayGoals: watched.awayGoals,
  };
  const results = payload.results.map((result) =>
    result.homeTeamId === scheduled.homeTeamId && result.awayTeamId === scheduled.awayTeamId
      ? override
      : result,
  );
  // Drop engine stats for the player club — career sync derives minutes from the fixture.
  const playerStats = payload.playerStats.filter((row) => row.teamId !== playerClubId);
  return { results, playerStats };
}

export async function advanceLeagueWeek(
  league: LeagueState | undefined,
  season: number,
  calendarWeek: number,
  masterSeed: number,
  careerPlayers: readonly Player[] = [],
  rivalPlayers: readonly Player[] = [],
  watchedPlayerMatch?: WatchedPlayerMatch | null,
): Promise<LeagueWeekAdvance> {
  const current = normalizeLeagueState(league, masterSeed);

  if (!isLeagueMatchWeek(calendarWeek) || current.season_complete) {
    return {
      league: current,
      playerFixture: null,
      matchdayPlayed: 0,
      seasonComplete: current.season_complete ?? false,
      clubPlayerStats: [],
    };
  }

  const maxMatchday = totalSeasonMatchdays(current);
  const matchdayPlayed = current.matchday;
  const baseSeed = weeklySeed(masterSeed, season, calendarWeek);
  const playerClubSquad = careerEngineSquadFromPlayers(careerPlayers, current.player_club_id);
  let payload = await fetchMatchdayPayload(
    matchdayPlayed,
    baseSeed,
    current.club_ids,
    playerClubSquad,
    rivalPlayers,
  );
  const scheduled = playerFixture(current, matchdayPlayed);
  const watchedApplies =
    watchedPlayerMatch != null &&
    scheduled != null &&
    watchedPlayerMatch.matchday === matchdayPlayed &&
    watchedPlayerMatch.homeTeamId === scheduled.homeTeamId &&
    watchedPlayerMatch.awayTeamId === scheduled.awayTeamId;
  if (watchedApplies && scheduled) {
    payload = applyWatchedPlayerFixture(
      payload,
      scheduled,
      watchedPlayerMatch,
      current.player_club_id,
    );
  }
  const playerResult = scheduled ? fixtureResult(payload.results, scheduled) ?? null : null;
  const seasonComplete = matchdayPlayed >= maxMatchday;
  const clubPlayerStats = watchedApplies
    ? []
    : payload.playerStats.filter((row) => row.teamId === current.player_club_id);

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
    clubPlayerStats,
  };
}

