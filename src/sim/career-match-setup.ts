import { matchdayFixtures, type ScheduledFixture, type TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";
import { clubShortName, playerFixture, weeklySeed } from "./league-week.ts";

export interface CareerMatchSetup {
  seed: number;
  matchday: number;
  calendarWeek: number;
  fixture: ScheduledFixture;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  playerClubId: TeamId;
  opponentShortName: string;
  isHome: boolean;
}

export function careerMatchSeed(
  masterSeed: number,
  season: number,
  calendarWeek: number,
  matchday: number,
  fixture: ScheduledFixture,
  clubIds: readonly TeamId[],
): number {
  const baseSeed = weeklySeed(masterSeed, season, calendarWeek);
  const fixtures = matchdayFixtures(clubIds, matchday);
  const index = fixtures.findIndex(
    (entry) =>
      entry.homeTeamId === fixture.homeTeamId && entry.awayTeamId === fixture.awayTeamId,
  );
  return baseSeed + Math.max(0, index) * 19;
}

export function prepareCareerMatch(session: GameSession): CareerMatchSetup | null {
  const matchWeek = session.week;
  if (!isLeagueMatchWeek(matchWeek) || session.league.season_complete) {
    return null;
  }

  const fixture = playerFixture(session.league, session.league.matchday);
  if (!fixture) return null;

  const playerClubId = session.league.player_club_id;
  const opponentId =
    fixture.homeTeamId === playerClubId ? fixture.awayTeamId : fixture.homeTeamId;

  return {
    seed: careerMatchSeed(
      session.masterSeed,
      session.season,
      matchWeek,
      session.league.matchday,
      fixture,
      session.league.club_ids,
    ),
    matchday: session.league.matchday,
    calendarWeek: matchWeek,
    fixture,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    playerClubId,
    opponentShortName: clubShortName(opponentId),
    isHome: fixture.homeTeamId === playerClubId,
  };
}
