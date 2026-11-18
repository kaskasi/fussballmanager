import { matchdayFixtures, type ScheduledFixture, type TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { isLeagueWeek, weekForMatchday } from "./season-schedule.ts";
import { clubShortName, playerFixture, weeklySeed } from "./league-week.ts";
import type { CupId, CupRoundKey } from "../competitions/cup-definition.ts";
import { managerCupTie } from "../competitions/cup-lookup.ts";

/** PRD 36 — set on a cup tie; absent = league match. */
export interface CareerMatchCup {
  id: CupId;
  round: number;
  key: CupRoundKey;
  /** The final: no home advantage, no home gate for either club. */
  neutral: boolean;
}

/** Competition key of a match (PRD 34 discipline keys). */
export function matchCompetition(setup: Pick<CareerMatchSetup, "cup"> | null | undefined): "league" | CupId {
  return setup?.cup?.id ?? "league";
}

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
  cup?: CareerMatchCup;
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
  return cupMatchForWeek(session, session.week) ?? careerMatchForWeek(session, session.week);
}

/** PRD 36 slice 2 — the manager's cup tie in `week`, as a match setup. */
function cupMatchForWeek(session: GameSession, week: number): CareerMatchSetup | null {
  const playerClubId = session.league.player_club_id;
  const found = managerCupTie(session.cups, week, playerClubId);
  if (!found) return null;
  const { tie } = found;
  const opponentId = tie.home === playerClubId ? tie.away : tie.home;
  return {
    seed: weeklySeed(session.masterSeed, session.season, week) + 7919 * found.round + 19 * found.index,
    matchday: session.league.matchday,
    calendarWeek: week,
    fixture: {
      id: `cup-${found.cup}-${session.season}-r${found.round}-${found.index}`,
      matchday: session.league.matchday,
      homeTeamId: tie.home,
      awayTeamId: tie.away,
    },
    homeTeamId: tie.home,
    awayTeamId: tie.away,
    playerClubId,
    opponentShortName: clubShortName(opponentId),
    isHome: tie.home === playerClubId,
    cup: { id: found.cup, round: found.round, key: found.key, neutral: tie.neutral ?? false },
  };
}

/** This week's fixture, or — in the preseason — the season opener, so lineup and analysis can be prepared early. */
export function prepareUpcomingCareerMatch(session: GameSession): CareerMatchSetup | null {
  // Before this season's first matchday (pre-season, breaks between seasons) prepare the next fixture.
  const nextMatchWeek = weekForMatchday(session.league.matchday);
  const matchWeek = isLeagueWeek(session.week) ? session.week : nextMatchWeek;
  return cupMatchForWeek(session, session.week) ?? careerMatchForWeek(session, matchWeek);
}

function careerMatchForWeek(session: GameSession, matchWeek: number): CareerMatchSetup | null {
  if (!isLeagueWeek(matchWeek) || session.league.season_complete) {
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
