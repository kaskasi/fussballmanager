import { expireBreakoutModifiers, processWeeklyBreakoutChecks } from "../development/breakouts.ts";
import { applyTrainingWeek } from "../development/pipeline-week.ts";
import { planToSessions } from "../development/training-units.ts";
import { advanceWeeklyClubFinances } from "../economy/club-finances.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { applyDepartureMoralePressure } from "../youth/departure-morale.ts";
import { accumulateWeeklyGrowth, weeklyAttributeGrowth } from "../player/growth-history.ts";
import { advanceScoutWeek } from "../scouting/scout-board.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import { advanceInboxWeek } from "../youth/decision-inbox.ts";
import { simulateYouthWeek } from "../youth/youth-sim.ts";
import { mergeCareerLeagueStats, applyCareerMatchWeek } from "./career-match-sync.ts";
import { advanceCalendarWeek } from "./game-calendar.ts";
import { advanceLeagueWeek } from "./league-week.ts";
import { runSeasonEnd } from "./season-end.ts";

export interface WeekSimResult {
  session: GameSession;
  seasonEnded: boolean;
  intakeCount: number;
}

export async function simulateGameWeek(session: GameSession): Promise<WeekSimResult> {
  const { nextWeek, footballSeasonEnded } = advanceCalendarWeek(session.week);
  const leagueStep = await advanceLeagueWeek(
    session.league,
    session.season,
    nextWeek,
    session.masterSeed,
    session.players,
  );

  const sessions = planToSessions(session.trainingPlan);
  let players = session.players.map((player) => {
    const before = player.attributes;
    const trained = applyTrainingWeek(player, sessions);
    const growth = weeklyAttributeGrowth(before, trained.attributes);
    return accumulateWeeklyGrowth(trained, growth);
  });

  const careerMatch = applyCareerMatchWeek(
    players,
    leagueStep.playerFixture,
    session.league.player_club_id,
    leagueStep.matchdayPlayed,
    session.masterSeed,
    session.season,
    leagueStep.clubPlayerStats,
  );
  players = careerMatch.players;
  const leagueWithCareerStats = {
    ...leagueStep.league,
    career_player_stats: mergeCareerLeagueStats(
      leagueStep.league.career_player_stats ?? [],
      careerMatch.matchdayStats,
    ),
  };

  const youth = simulateYouthWeek(players, session.week, session.masterSeed);
  players = youth.players;

  const breakouts = processWeeklyBreakoutChecks(players, nextWeek, session.masterSeed);
  players = expireBreakoutModifiers(breakouts.players, nextWeek);
  players = refreshAllMarketValues(players, session.season);

  const advanced = advanceInboxWeek(
    session.youthInbox,
    players,
    nextWeek,
    session.masterSeed,
    youth.report,
  );
  const playersWithMorale = applyDepartureMoralePressure(advanced.players, advanced.inbox);
  const finances = advanceWeeklyClubFinances(session.finances, playersWithMorale, session.clubId);

  const seasonEnded = footballSeasonEnded;
  let nextSession: GameSession = {
    ...session,
    season: seasonEnded ? session.season + 1 : session.season,
    week: nextWeek,
    players: playersWithMorale,
    scoutBoard: advanceScoutWeek(session.scoutBoard, nextWeek),
    youthInbox: advanced.inbox,
    league: leagueWithCareerStats,
    finances,
  };

  let intakeCount = 0;
  if (seasonEnded) {
    const ended = runSeasonEnd(nextSession, session.season);
    nextSession = ended.session;
    intakeCount = ended.intakeCount;
  }

  return { session: nextSession, seasonEnded, intakeCount };
}
