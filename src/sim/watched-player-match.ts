import type { MatchView, TeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "./career-match-setup.ts";

/** Result from a career match the manager already watched or skipped to the end. */
export interface WatchedPlayerMatch {
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeGoals: number;
  awayGoals: number;
  matchday: number;
}

export function watchedMatchFromView(
  setup: CareerMatchSetup,
  view: MatchView,
): WatchedPlayerMatch {
  return {
    homeTeamId: setup.homeTeamId,
    awayTeamId: setup.awayTeamId,
    homeGoals: view.finalScore.home,
    awayGoals: view.finalScore.away,
    matchday: setup.matchday,
  };
}
