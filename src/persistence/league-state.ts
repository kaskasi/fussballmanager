import { NORDSTERN_ID } from "@fussballmanager/shared";
import type { FixtureResult, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { CLUBS_PER_DIVISION } from "../world/world-generator.ts";
import { DEFAULT_WORLD_SEED, defaultLeaguePools } from "../sim/league-divisions.ts";
import { DEFAULT_DIVISION_ID, PYRAMID } from "../sim/league-pyramid.ts";

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
  /**
   * PRD 32 §7 — this season's quick-sim results of every other division, one
   * matchday per league week. The manager's division keeps `results`.
   */
  division_results?: Partial<Record<DivisionEconomyId, FixtureResult[]>>;
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
    division_results: {},
    player_stats: [],
    career_player_stats: [],
    season_complete: false,
  };
}

export function normalizeLeagueState(
  league: LeagueState | null | undefined,
  masterSeed = DEFAULT_WORLD_SEED,
): LeagueState {
  const base = league ?? defaultLeagueState();
  const division_id = base.division_id ?? DEFAULT_DIVISION_ID;
  const storedPools = base.league_pools;
  const incomplete = (division: (typeof PYRAMID)[number]) =>
    (storedPools?.[division.id]?.length ?? 0) < division.clubCount;
  // A broken northern pool resets the layer (legacy saves); a missing national
  // tier (saves from before PRD 32 slice 2) is filled on its own, so stored
  // promotions survive.
  const defaults = defaultLeaguePools();
  const pools = !storedPools || PYRAMID.some((division) => division.careerStart && incomplete(division))
    ? defaults
    : Object.fromEntries(
        PYRAMID.map((division) => [
          division.id,
          incomplete(division) ? defaults[division.id] : storedPools[division.id],
        ]),
      ) as LeagueState["league_pools"] & object;
  const clubIdsIncomplete = (base.club_ids?.length ?? 0) < CLUBS_PER_DIVISION;
  return {
    ...base,
    division_id,
    league_pools: pools,
    club_ids: clubIdsIncomplete || !base.club_ids?.length
      ? [...(pools[division_id] ?? [])]
      : [...base.club_ids],
    meetings_per_opponent: base.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT,
    division_results: base.division_results ?? {},
    player_stats: base.player_stats ?? [],
    career_player_stats: base.career_player_stats ?? [],
    season_complete: base.season_complete ?? false,
  };
}

export function defaultLeagueState(): LeagueState {
  const pools = defaultLeaguePools();
  const club_ids = pools[DEFAULT_DIVISION_ID];
  return {
    division_id: DEFAULT_DIVISION_ID,
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
