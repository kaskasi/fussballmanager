import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import type { TeamId } from "@fussballmanager/shared";

export function opponentScoutMatchIdFromFixture(
  season: number,
  week: number,
  matchday: number,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
): string {
  return `s${season}_w${week}_md${matchday}_${homeTeamId}_${awayTeamId}`;
}

export function opponentScoutMatchIdFromSetup(season: number, setup: CareerMatchSetup): string {
  return opponentScoutMatchIdFromFixture(
    season,
    setup.calendarWeek,
    setup.matchday,
    setup.homeTeamId,
    setup.awayTeamId,
  );
}
