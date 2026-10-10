import type { MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "./career-match-setup.ts";

/** Result from a career match the manager already watched or skipped to the end. */
export interface WatchedPlayerMatch {
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeGoals: number;
  awayGoals: number;
  matchday: number;
  /** Manager club only — career sync on the pro squad. */
  playerClubStats?: readonly PlayerSeasonStat[];
  /** Both clubs in the watched fixture — league table / rival sync. */
  fixtureStats?: readonly PlayerSeasonStat[];
}

export function watchedMatchFromView(
  setup: CareerMatchSetup,
  view: MatchView,
): WatchedPlayerMatch {
  const fixtureTeamIds = new Set<TeamId>([setup.homeTeamId, setup.awayTeamId]);
  const fixtureStats = view.report.playerStats.filter((row) => fixtureTeamIds.has(row.teamId));
  const playerClubStats = fixtureStats.filter((row) => row.teamId === setup.playerClubId);
  return {
    homeTeamId: setup.homeTeamId,
    awayTeamId: setup.awayTeamId,
    homeGoals: view.finalScore.home,
    awayGoals: view.finalScore.away,
    matchday: setup.matchday,
    playerClubStats,
    fixtureStats,
  };
}
