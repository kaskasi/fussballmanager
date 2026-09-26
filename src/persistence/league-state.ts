import { NORDSTERN_ID, SEED_DIVISION } from "@fussballmanager/shared";
import type { FixtureResult, TeamId } from "@fussballmanager/shared";

/** Engine-side league snapshot stored in `state.json`. */
export interface LeagueState {
  division_id: "regionalliga-nord";
  player_club_id: TeamId;
  club_ids: TeamId[];
  /** Next matchday to play (1-based). */
  matchday: number;
  results: FixtureResult[];
}

export const PLAYER_ENGINE_CLUB_ID = NORDSTERN_ID;

export function defaultLeagueState(): LeagueState {
  const club_ids = SEED_DIVISION.map((squad) => squad.team.id);
  return {
    division_id: "regionalliga-nord",
    player_club_id: PLAYER_ENGINE_CLUB_ID,
    club_ids: [...club_ids],
    matchday: 1,
    results: [],
  };
}
