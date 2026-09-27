import { NORDSTERN_ID } from "@fussballmanager/shared";
import type { FixtureResult, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";

/** 18-team double round robin: 17 opponents × 2 = 34 league games. */
export const LEAGUE_MEETINGS_PER_OPPONENT = 2;

/** Career-player contributions for the manager club (replaces engine names in the hub). */
export interface CareerLeagueStat {
  playerId: string;
  name: string;
  goals: number;
  assists: number;
  yellowCards: number;
  minutes: number;
  apps: number;
}

/** Engine-side league snapshot stored in `state.json`. */
export interface LeagueState {
  division_id: DivisionEconomyId;
  player_club_id: TeamId;
  club_ids: TeamId[];
  league_pools?: Record<DivisionEconomyId, TeamId[]>;
  /** Pairings per opponent within one season (18-team default: 2 → 34 matchdays). */
  meetings_per_opponent: number;
  /** Next matchday to play (1-based). */
  matchday: number;
  results: FixtureResult[];
  player_stats: PlayerSeasonStat[];
  career_player_stats?: CareerLeagueStat[];
  /** Set after the final matchday until the next week sim clears the table. */
  season_complete?: boolean;
}

export function totalSeasonMatchdays(league: Pick<LeagueState, "club_ids" | "meetings_per_opponent">): number {
  const meetings = league.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT;
  return (league.club_ids.length - 1) * meetings;
}

export const PLAYER_ENGINE_CLUB_ID = NORDSTERN_ID;

export function resetLeagueSeason(league: LeagueState): LeagueState {
  return {
    ...league,
    matchday: 1,
    results: [],
    player_stats: [],
    career_player_stats: [],
    season_complete: false,
  };
}

export function normalizeLeagueState(league: LeagueState): LeagueState {
  const pools = league.league_pools ?? defaultLeaguePools();
  const division_id = league.division_id ?? "regionalliga-nord";
  return {
    ...league,
    division_id,
    league_pools: pools,
    club_ids: league.club_ids?.length
      ? [...league.club_ids]
      : [...(pools[division_id] ?? [])],
    meetings_per_opponent: league.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT,
    player_stats: league.player_stats ?? [],
    career_player_stats: league.career_player_stats ?? [],
    season_complete: league.season_complete ?? false,
  };
}

export function defaultLeagueState(): LeagueState {
  const pools = defaultLeaguePools();
  const club_ids = pools["regionalliga-nord"];
  return {
    division_id: "regionalliga-nord",
    player_club_id: PLAYER_ENGINE_CLUB_ID,
    club_ids: [...club_ids],
    league_pools: pools,
    meetings_per_opponent: LEAGUE_MEETINGS_PER_OPPONENT,
    matchday: 1,
    results: [],
    player_stats: [],
    career_player_stats: [],
    season_complete: false,
  };
}
