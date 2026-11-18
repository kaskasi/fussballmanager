import type { MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { CareerMatchCup, CareerMatchSetup } from "./career-match-setup.ts";
import { cupShootout, shootoutTakers, type Shootout } from "../competitions/cup-shootout.ts";
import type { CupTieResult } from "../competitions/cup-tie.ts";

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
  /** PRD 36 — set for a cup tie; the league step ignores the result. */
  cup?: CareerMatchCup;
  /** Cup tie level after 90 minutes: the shootout that decided it. */
  shootout?: Shootout;
}

/** PRD 36 slice 2 — a level cup tie is decided on penalties, kick by kick. */
export function cupShootoutForView(setup: CareerMatchSetup, view: MatchView): Shootout | undefined {
  if (!setup.cup || view.finalScore.home !== view.finalScore.away) return undefined;
  return cupShootout(
    setup.seed,
    shootoutTakers(view.roster, String(setup.homeTeamId)),
    shootoutTakers(view.roster, String(setup.awayTeamId)),
  );
}

export function watchedMatchFromView(
  setup: CareerMatchSetup,
  view: MatchView,
): WatchedPlayerMatch {
  const fixtureTeamIds = new Set<TeamId>([setup.homeTeamId, setup.awayTeamId]);
  const fixtureStats = view.report.playerStats.filter((row) => fixtureTeamIds.has(row.teamId));
  const playerClubStats = fixtureStats.filter((row) => row.teamId === setup.playerClubId);
  const shootout = cupShootoutForView(setup, view);
  return {
    homeTeamId: setup.homeTeamId,
    awayTeamId: setup.awayTeamId,
    homeGoals: view.finalScore.home,
    awayGoals: view.finalScore.away,
    matchday: setup.matchday,
    playerClubStats,
    fixtureStats,
    ...(setup.cup ? { cup: setup.cup } : {}),
    ...(shootout ? { shootout } : {}),
  };
}

/** The watched cup tie as a cup result (shootout decides a level score). */
export function watchedCupResult(watched: WatchedPlayerMatch): CupTieResult {
  const { homeGoals, awayGoals, homeTeamId, awayTeamId } = watched;
  if (homeGoals !== awayGoals) {
    return { homeGoals, awayGoals, winner: homeGoals > awayGoals ? homeTeamId : awayTeamId };
  }
  const [penHome, penAway] = watched.shootout?.score ?? [1, 0];
  return {
    homeGoals,
    awayGoals,
    penalties: [penHome, penAway],
    winner: penHome > penAway ? homeTeamId : awayTeamId,
  };
}
