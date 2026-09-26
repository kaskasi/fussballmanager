import { NORDSTERN_ID, SEED_DIVISION } from "@fussballmanager/shared";
import type { FixtureResult, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";

/**
 * 6-team league: each club meets every opponent 6 times → 5 × 6 = 30 league games.
 */
export const LEAGUE_MEETINGS_PER_OPPONENT = 6;

/** Engine-side league snapshot stored in `state.json`. */
export interface LeagueState {
  division_id: "regionalliga-nord";
  player_club_id: TeamId;
  club_ids: TeamId[];
  /** Pairings per opponent within one season (6-team default: 6 → 30 matchdays). */
  meetings_per_opponent: number;
  /** Next matchday to play (1-based). */
  matchday: number;
  results: FixtureResult[];
  player_stats: PlayerSeasonStat[];
  /** Set after the final matchday until the next week sim clears the table. */
  season_complete?: boolean;
}

export function totalSeasonMatchdays(league: Pick<LeagueState, "club_ids" | "meetings_per_opponent">): number {
  const meetings = league.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT;
  return (league.club_ids.length - 1) * meetings;
}

export const PLAYER_ENGINE_CLUB_ID = NORDSTERN_ID;

export function defaultLeagueState(): LeagueState {
  const club_ids = SEED_DIVISION.map((squad) => squad.team.id);
  return {
    division_id: "regionalliga-nord",
    player_club_id: PLAYER_ENGINE_CLUB_ID,
    club_ids: [...club_ids],
    meetings_per_opponent: LEAGUE_MEETINGS_PER_OPPONENT,
    matchday: 1,
    results: [],
    player_stats: [],
    season_complete: false,
  };
}
