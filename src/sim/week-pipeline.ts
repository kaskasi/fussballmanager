import { expireBreakoutModifiers, processWeeklyBreakoutChecks } from "../development/breakouts.ts";
import { applyTrainingWeek } from "../development/pipeline-week.ts";
import { planToSessions } from "../development/training-units.ts";
import { advanceWeeklyClubFinances } from "../economy/club-finances.ts";
import type { FixtureResult } from "@fussballmanager/shared";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { applyDepartureMoralePressure } from "../youth/departure-morale.ts";
import { stampLastWeekCa } from "../player/ca-tracking.ts";
import { stampWeeklyGrowthBatch } from "../player/growth-history.ts";
import { advanceScoutWeek } from "../scouting/scout-board.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import { withClubEvent } from "../inbox/club-events.ts";
import { loanReturnMessage } from "../transfers/transfer-history.ts";
import { advanceInboxWeek } from "../youth/decision-inbox.ts";
import { advanceClubFanbase, weeklyFanbaseDelta } from "../stadium/fanbase.ts";
import { advanceProTrials } from "../youth/pro-trial.ts";
import { simulateYouthWeek } from "../youth/youth-sim.ts";
import { mergeCareerLeagueStats, applyCareerMatchWeek } from "./career-match-sync.ts";
import { advanceCalendarWeek, SEASON_END_WEEK } from "./game-calendar.ts";
import { advanceLeagueWeek } from "./league-week.ts";
import { runSeasonEnd } from "./season-end.ts";

export interface WeekSimResult {
  session: GameSession;
  seasonEnded: boolean;
  intakeCount: number;
  playerFixture: FixtureResult | null;
  matchdayStats: CareerLeagueStat[];
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

  const playersAtWeekStart = session.players;
  const sessions = planToSessions(session.trainingPlan);
  const trainingContext = { season: session.season, week: nextWeek };
  let players = session.players.map((player) =>
    applyTrainingWeek(player, sessions, trainingContext),
  );

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

  const youth = simulateYouthWeek(players, session.week, session.masterSeed, session.clubId);
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
  const trialStep = advanceProTrials(advanced.players, session.clubId, session.season, nextWeek);
  const playersWithMorale = applyDepartureMoralePressure(trialStep.players, advanced.inbox);
  const fanbaseDelta = weeklyFanbaseDelta(
    leagueWithCareerStats,
    session.clubId,
    leagueStep.playerFixture != null,
  );
  const stadium = advanceClubFanbase(session.stadium, fanbaseDelta);
  const isHomeMatchWeek =
    leagueStep.playerFixture?.homeTeamId === session.league.player_club_id;
  const financeStep = advanceWeeklyClubFinances(session.finances, {
    players: playersWithMorale,
    clubId: session.clubId,
    divisionId: session.league.division_id,
    isHomeMatchWeek,
    season: session.season,
    week: nextWeek,
    stadium,
  });
  const finances = financeStep.finances;
  const playersWithGrowth = stampWeeklyGrowthBatch(playersAtWeekStart, playersWithMorale);
  const playersWithCaStamp = playersWithGrowth.map(stampLastWeekCa);

  const seasonEnded = footballSeasonEnded;
  let nextSession: GameSession = {
    ...session,
    season: seasonEnded ? session.season + 1 : session.season,
    week: nextWeek,
    players: playersWithCaStamp,
    scoutBoard: advanceScoutWeek(session.scoutBoard, nextWeek),
    youthInbox: advanced.inbox,
    league: leagueWithCareerStats,
    finances,
    stadium,
  };

  let intakeCount = 0;
  if (seasonEnded) {
    const ended = runSeasonEnd(nextSession, session.season);
    let clubEvents = nextSession.clubEvents;
    for (const record of ended.loanReturns) {
      clubEvents = withClubEvent(
        clubEvents,
        record.season,
        record.week,
        "transfer",
        loanReturnMessage(record),
      );
    }
    if (ended.boardEvaluation) {
      clubEvents = withClubEvent(
        clubEvents,
        session.season,
        SEASON_END_WEEK,
        "info",
        ended.boardEvaluation.summary,
      );
    }
    if (ended.promotionRelegation) {
      for (const message of ended.promotionRelegation.messages) {
        clubEvents = withClubEvent(clubEvents, session.season, SEASON_END_WEEK, "info", message);
      }
    }
    nextSession = { ...ended.session, clubEvents };
    intakeCount = ended.intakeCount;
  }

  return {
    session: nextSession,
    seasonEnded,
    intakeCount,
    playerFixture: leagueStep.playerFixture,
    matchdayStats: careerMatch.matchdayStats,
  };
}
