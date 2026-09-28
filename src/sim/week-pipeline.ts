import {
  expireBreakoutModifiers,
  processWeeklyBreakoutChecks,
  type BreakoutNarrative,
} from "../development/breakouts.ts";
import { advanceIndividualTrainingWeek } from "../development/individual-training.ts";
import { applyTrainingWeek } from "../development/pipeline-week.ts";
import { planToSessions } from "../development/training-units.ts";
import { advanceWeeklyClubFinances } from "../economy/club-finances.ts";
import type { FixtureResult } from "@fussballmanager/shared";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { applyDepartureMoralePressure } from "../youth/departure-morale.ts";
import { stampLastWeekCa } from "../player/ca-tracking.ts";
import { stampWeeklyGrowthBatch } from "../player/growth-history.ts";
import {
  advanceScoutWeek,
  discoveryAlertsForWeek,
  reconcileScoutBoard,
} from "../scouting/scout-board.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import { withClubEvent, type ClubEvent } from "../inbox/club-events.ts";
import { advanceAiTransferWeek } from "../transfers/ai-transfer-market.ts";
import { loanReturnMessage } from "../transfers/transfer-history.ts";
import { isTransferWindowOpen } from "./transfer-windows.ts";
import { advanceInboxWeek } from "../youth/decision-inbox.ts";
import { advanceClubFanbase, weeklyFanbaseDelta } from "../stadium/fanbase.ts";
import { advanceProTrials } from "../youth/pro-trial.ts";
import { simulateYouthWeek } from "../youth/youth-sim.ts";
import { careerStarterIds } from "../match/lineup-board.ts";
import { mergeCareerLeagueStats, applyCareerMatchWeek } from "./career-match-sync.ts";
import { advanceCalendarWeek, SEASON_END_WEEK } from "./game-calendar.ts";
import { advanceLeagueWeek } from "./league-week.ts";
import { runSeasonEnd } from "./season-end.ts";
import { environmentFromCoachingStaff } from "../staff/coaching-staff.ts";
import { advanceRivalGrowthWeek } from "./rival-growth.ts";
import { applyWeeklyFitnessBatch } from "../development/fitness-management.ts";
import type { WatchedPlayerMatch } from "./watched-player-match.ts";

export interface WeekSimResult {
  session: GameSession;
  seasonEnded: boolean;
  intakeCount: number;
  playerFixture: FixtureResult | null;
  matchdayStats: CareerLeagueStat[];
}

export function appendBreakoutNarrativesToEvents(
  events: readonly ClubEvent[],
  narratives: readonly BreakoutNarrative[],
  season: number,
  week: number,
): ClubEvent[] {
  let next = [...events];
  for (const narrative of narratives) {
    next = withClubEvent(
      next,
      season,
      week,
      "profile",
      `💡 ${narrative.narrative}`,
    );
  }
  return next;
}

export async function simulateGameWeek(
  session: GameSession,
  watchedPlayerMatch?: WatchedPlayerMatch | null,
): Promise<WeekSimResult> {
  const { nextWeek, footballSeasonEnded } = advanceCalendarWeek(session.week);
  const leagueStep = await advanceLeagueWeek(
    session.league,
    session.season,
    nextWeek,
    session.masterSeed,
    session.players,
    session.rivalPlayers,
    watchedPlayerMatch,
  );

  const playersAtWeekStart = session.players;
  const sessions = planToSessions(session.trainingPlan);
  const trainingContext = {
    season: session.season,
    week: nextWeek,
    masterSeed: session.masterSeed,
    intensity: session.trainingIntensity,
    environmentFactor: environmentFromCoachingStaff(session.coachingStaff),
  };
  let players = session.players.map((player) =>
    applyTrainingWeek(player, sessions, trainingContext),
  );

  const individualStep = advanceIndividualTrainingWeek(
    players,
    session.individualPrograms,
    trainingContext,
  );
  players = individualStep.players;

  const savedStarters = session.matchLineup
    ? careerStarterIds(session.matchLineup.assignments)
    : undefined;
  const careerMatch = applyCareerMatchWeek(
    players,
    leagueStep.playerFixture,
    session.league.player_club_id,
    leagueStep.matchdayPlayed,
    session.masterSeed,
    session.season,
    leagueStep.clubPlayerStats,
    savedStarters,
  );
  players = applyWeeklyFitnessBatch(careerMatch.players, {
    intensity: session.trainingIntensity,
    coachingStaff: session.coachingStaff,
  });
  const leagueWithCareerStats = {
    ...leagueStep.league,
    career_player_stats: mergeCareerLeagueStats(
      leagueStep.league.career_player_stats ?? [],
      careerMatch.matchdayStats,
    ),
  };

  const youth = simulateYouthWeek(players, session.week, session.masterSeed, session.clubId);
  players = youth.players;

  const breakouts = processWeeklyBreakoutChecks(
    players,
    nextWeek,
    session.masterSeed,
    session.season,
  );
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
    coachingStaff: session.coachingStaff,
  });
  const finances = financeStep.finances;
  const playersWithGrowth = stampWeeklyGrowthBatch(playersAtWeekStart, playersWithMorale);
  const playersWithCaStamp = playersWithGrowth.map(stampLastWeekCa);

  const seasonEnded = footballSeasonEnded;
  let rivalPlayers = advanceRivalGrowthWeek(
    session.rivalPlayers,
    session.season,
    nextWeek,
    session.masterSeed,
    leagueStep.matchdayPlayed > 0,
  );
  const rivalBreakouts = processWeeklyBreakoutChecks(
    rivalPlayers,
    nextWeek,
    session.masterSeed,
    session.season,
  );
  rivalPlayers = expireBreakoutModifiers(rivalBreakouts.players, nextWeek);

  let transferState = session.transferState;
  let clubEvents = appendBreakoutNarrativesToEvents(
    session.clubEvents,
    breakouts.narratives,
    session.season,
    nextWeek,
  );
  if (isTransferWindowOpen(nextWeek)) {
    const aiTransfers = advanceAiTransferWeek({
      rivalPlayers,
      transferState,
      leagueClubIds: leagueWithCareerStats.club_ids,
      divisionId: leagueWithCareerStats.division_id,
      season: session.season,
      week: nextWeek,
      masterSeed: session.masterSeed,
    });
    rivalPlayers = aiTransfers.rivalPlayers;
    transferState = aiTransfers.transferState;
    for (const message of aiTransfers.messages) {
      clubEvents = withClubEvent(clubEvents, session.season, nextWeek, "transfer", `💱 ${message}`);
    }
  }

  const scoutBoard = reconcileScoutBoard(
    advanceScoutWeek(session.scoutBoard, nextWeek, rivalPlayers, session.world.clubs),
    rivalPlayers,
  );
  for (const alert of discoveryAlertsForWeek(scoutBoard, nextWeek)) {
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "profile",
      `${alert.headline}: ${alert.playerName} (CA ~${alert.estimatedCa})`,
    );
  }
  let nextSession: GameSession = {
    ...session,
    season: seasonEnded ? session.season + 1 : session.season,
    week: nextWeek,
    players: playersWithCaStamp,
    scoutBoard,
    youthInbox: advanced.inbox,
    league: leagueWithCareerStats,
    finances,
    stadium,
    rivalPlayers,
    transferState,
    clubEvents,
    individualPrograms: individualStep.programs,
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
