import { t } from "../i18n/index.ts";
import {
  expireBreakoutModifiers,
  processSummitBreakout,
  processWeeklyBreakoutChecks,
  trackBenchWeek,
  type BreakoutNarrative,
} from "../development/breakouts.ts";
import { evaluateClearStamps, evaluateEventStamps } from "../development/ability-stamps.ts";
import { advanceIndividualTrainingWeek } from "../development/individual-training.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  applyPlanFitnessRecovery,
  applyTrainingWeek,
  applyWeeklyAttributeDecay,
} from "../development/pipeline-week.ts";
import {
  resolveFeatureCurtain,
  resolveTrainingPlanAfterWeek,
} from "../narrative/career-presentation.ts";
import {
  emptyWeeklyTrainingPlan,
  planToSessions,
} from "../development/training-units.ts";
import {
  applyTrainingNeglectMorale,
  isTrainingPlanNeglected,
  TRAINING_NEGLECT_BOARD_PRESSURE,
  TRAINING_NEGLECT_FANBASE_PENALTY,
} from "../development/training-neglect.ts";
import { advanceWeeklyClubFinances } from "../economy/club-finances.ts";
import { advanceWeeklyLoanServicing } from "../economy/financing.ts";
import { advanceFinancingStoryOffersWeek } from "../economy/financing-pipeline.ts";
import { advanceFinancialCrisisWeek } from "../economy/financing-crisis.ts";
import { revertExpiredNamingRights } from "../stadium/club-stadium.ts";
import { advanceCareerConstruction } from "./advance-construction.ts";
import { refreshAiListings, scanListingBids } from "../transfers/transfer-listings.ts";
import { advanceMerchandisingWeek } from "../economy/merchandising.ts";
import {
  merchSaleSummaryClubEventMessage,
  merchStockDisposalClubEventMessage,
} from "../inbox/merch-notifications.ts";
import type { FixtureResult } from "@fussballmanager/shared";
import { normalizeLeagueState, type CareerLeagueStat } from "../persistence/league-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { applyDepartureMoralePressure } from "../youth/departure-morale.ts";
import { stampLastWeekCa } from "../player/ca-tracking.ts";
import {
  stampWeekStartAttributesBatch,
  stampWeeklyGrowthBatch,
} from "../player/growth-history.ts";
import {
  advanceScoutWeek,
  discoveryAlertsForWeek,
  reconcileScoutBoard,
} from "../scouting/scout-board.ts";
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";
import { withClubEvent, type ClubEvent } from "../inbox/club-events.ts";
import { advanceAiTransferWeek } from "../transfers/ai-transfer-market.ts";
import { scanInboundOffers } from "../transfers/inbound-offers.ts";
import { advanceUnderpaidContractWeek } from "../transfers/underpaid-contract.ts";
import {
  enqueueUnderpaidRenegotiateItems,
  type UnderpaidInboxPrompt,
} from "../transfers/underpaid-inbox.ts";
import { loanReturnMessage } from "../transfers/transfer-history.ts";
import { isTransferWindowOpen } from "./transfer-windows.ts";
import { advanceInboxWeek } from "../youth/decision-inbox.ts";
import { advanceClubFanbase, weeklyFanbaseDelta } from "../stadium/fanbase.ts";
import { advanceProTrials } from "../youth/pro-trial.ts";
import { simulateYouthWeek } from "../youth/youth-sim.ts";
import { careerStarterIds } from "../match/lineup-board.ts";
import { mergeCareerLeagueStats, applyCareerMatchWeek } from "./career-match-sync.ts";
import { applyRivalMatchdayStats } from "./rival-matchday-stats.ts";
import { advanceCalendarWeek, SEASON_END_WEEK } from "./game-calendar.ts";
import { advanceLeagueWeek } from "./league-week.ts";
import { runSeasonEnd } from "./season-end.ts";
import { environmentFromCoachingStaff } from "../staff/coaching-staff.ts";
import { weekCommerceOccupancy } from "../stadium/matchday-commerce.ts";
import {
  precinctFitnessRegen,
  precinctTrainingEnvironment,
  precinctWeeklyFanbaseBonus,
} from "../stadium/precinct-effects.ts";
import { advanceRivalGrowthWeek } from "./rival-growth.ts";
import { applyWeeklyFitnessBatch } from "../development/fitness-management.ts";
import {
  rollWeeklyInjuries,
  tickInjuryRecoveryBatch,
} from "../development/injury-roll.ts";
import {
  precinctMedicalCenterLevel,
  precinctTzPhysioStack,
} from "../stadium/precinct-effects.ts";
import { careerInjuryRiskFactor } from "../medical/career-injury-risk.ts";
import {
  medicalModifiers,
  medicalStaffWageBill,
  normalizeMedicalStaff,
} from "../staff/medical-staff.ts";
import { appendPendingDiagnoses } from "../medical/medical-session.ts";
import { startPhysioWeek } from "../medical/injury-care.ts";
import { merchCareerDayIndex } from "../economy/merchandising-market.ts";
import type { WatchedPlayerMatch } from "./watched-player-match.ts";
import { advanceNarrativeWeek } from "../narrative/pipeline-week.ts";
import { advanceMentorshipWeek } from "../development/mentoring.ts";
import {
  careerWeekIndex,
  hotelOccupancyPct,
  restaurantOccupancyPct,
  restaurantViralActive,
  RESTAURANT_OVERTIME_COST,
  weeklyHotelIncome,
  weeklyRestaurantIncome,
} from "../stadium/hospitality.ts";
import {
  DEFAULT_FANBASE,
  normalizeClubStadium,
  stadiumTotalCapacity,
} from "../stadium/club-stadium.ts";
import { maybeStadiumMegaEventWeek } from "../stadium/precinct-campus-events.ts";
import { advanceBlockExpansionProjects } from "../stadium/stadium-block-expansion.ts";
import { advancePrecinctConstructionDetailed } from "../stadium/precinct-construction.ts";
import { clubFlavorFanbase } from "./club-profiles.ts";
import { campNationById, weeklyCampUpkeep } from "../youth/satellite-camps.ts";
import { advanceYouthCampsForWeek, type CampWeekDebut } from "../youth/camp-construction-week.ts";
import { scoutNetworkWeeklyWage } from "../scouting/scout-network.ts";
import {
  applyAssistantDelegationWeek,
  assistantQuality,
} from "../staff/assistant-delegation.ts";

export interface WeekSimResult {
  session: GameSession;
  seasonEnded: boolean;
  intakeCount: number;
  playerFixture: FixtureResult | null;
  matchdayStats: CareerLeagueStat[];
  campDebuts: CampWeekDebut[];
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
      t("clubEvent.profileInsight", { narrative: narrative.narrative }),
    );
  }
  return next;
}

export async function simulateGameWeek(
  sessionInput: GameSession,
  watchedPlayerMatch?: WatchedPlayerMatch | null,
): Promise<WeekSimResult> {
  let session: GameSession = {
    ...sessionInput,
    league: normalizeLeagueState(sessionInput.league, sessionInput.masterSeed),
  };
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

  const delegationStep = applyAssistantDelegationWeek({
    delegation: session.assistantDelegation,
    assistantName: session.storyState.cast.assistant_name,
    quality: assistantQuality(session.coachingStaff),
    players: session.players,
    clubId: session.clubId,
    trainingPlan: session.trainingPlan,
    scoutBoard: session.scoutBoard,
    rivalPlayers: session.rivalPlayers,
    tacticsPresets: session.tacticsPresets,
    matchLineup: session.matchLineup,
    season: session.season,
    week: nextWeek,
    masterSeed: session.masterSeed,
    hasPlayerFixture: leagueStep.playerFixture != null,
  });
  let clubEvents = session.clubEvents;
  for (const message of delegationStep.messages) {
    clubEvents = withClubEvent(clubEvents, session.season, nextWeek, "info", message);
  }
  session = {
    ...session,
    trainingPlan: delegationStep.trainingPlan ?? session.trainingPlan,
    scoutBoard: delegationStep.scoutBoard ?? session.scoutBoard,
    matchLineup: delegationStep.matchLineup ?? session.matchLineup,
    clubEvents,
  };

  const playersAtWeekStart = session.players;
  const trainingPlanNeglected = isTrainingPlanNeglected(session.trainingPlan);
  let board = session.board;
  if (trainingPlanNeglected) {
    board = {
      ...board,
      pressure: Math.min(
        100,
        Math.max(0, board.pressure + TRAINING_NEGLECT_BOARD_PRESSURE),
      ),
    };
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "info",
      "Vorstand: Kein strukturiertes Training — das akzeptieren wir nicht dauerhaft.",
    );
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "info",
      "Fans: Ohne Plan auf dem Platz wirkt der Verein planlos — Vertrauen leidet.",
    );
  }
  const sessions = planToSessions(session.trainingPlan);
  const leagueMatchdaysPlayed = Math.max(0, session.league.matchday - 1);
  const trainingContext = {
    season: session.season,
    week: nextWeek,
    masterSeed: session.masterSeed,
    intensity: session.trainingIntensity,
    leagueMatchdaysPlayed,
    environmentFactor:
      environmentFromCoachingStaff(session.coachingStaff) *
      precinctTrainingEnvironment(session.stadium.precinct, {
        season: session.season,
        week: nextWeek,
      }),
  };
  const manualTrainingUnits = !resolveFeatureCurtain(session.storyState).auto_training;
  let players = tickInjuryRecoveryBatch(session.players, nextWeek).map((player) => {
    if (manualTrainingUnits) return applyWeeklyAttributeDecay(player);
    const trained = applyTrainingWeek(player, sessions, trainingContext);
    return applyPlanFitnessRecovery(trained, session.trainingPlan);
  });

  const individualStep = advanceIndividualTrainingWeek(
    players,
    session.individualPrograms,
    trainingContext,
  );
  players = individualStep.players;
  for (const award of individualStep.awards) {
    const named = players.find((entry) => entry.id === award.playerId);
    const who = named ? formatPlayerName(named) : award.playerId;
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "inbox",
      `${award.icon} ${who} verdient ${award.label}`,
    );
  }
  for (const notice of individualStep.retrainNotices) {
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "profile",
      notice.label,
    );
  }

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
    precinctRegen: precinctFitnessRegen(session.stadium.precinct),
  }).map((player) => trackBenchWeek(player, player.state.weekly_minutes));
  const medLevel = precinctMedicalCenterLevel(session.stadium.precinct);
  const medMods = medicalModifiers(
    normalizeMedicalStaff(session.medicalStaff),
    medLevel,
    precinctTzPhysioStack(session.stadium.precinct),
  );
  const injuryRoll = rollWeeklyInjuries(players, {
    masterSeed: session.masterSeed,
    season: session.season,
    week: nextWeek,
    intensity: session.trainingIntensity,
    injuryRiskFactor: careerInjuryRiskFactor(session.stadium.precinct, session.medicalStaff),
    managerClubId: session.clubId,
    medicalDiagnosisDays: medLevel > 0 ? medMods.diagnosisDays : undefined,
    careerDay:
      medLevel > 0 ? merchCareerDayIndex(session.season, nextWeek, 6) : undefined,
  });
  players = injuryRoll.players;
  session = appendPendingDiagnoses(session, injuryRoll.pendingDiagnoses);
  for (const notice of injuryRoll.notices) {
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "profile",
      `Verletzt: ${notice.playerName} — ${notice.label}, ${notice.weeks} Wo.`,
    );
  }
  const clearedStamps = evaluateClearStamps(players);
  players = clearedStamps.players;
  for (const notice of clearedStamps.cleared) {
    const named = players.find((entry) => entry.id === notice.playerId);
    const who = named ? formatPlayerName(named) : notice.playerId;
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "inbox",
      `${notice.icon} ${who} legt ${notice.label} ab`,
    );
  }
  const eventStamps = evaluateEventStamps(players, session.season, nextWeek);
  players = eventStamps.players;
  for (const award of eventStamps.awards) {
    const named = players.find((entry) => entry.id === award.playerId);
    const who = named ? formatPlayerName(named) : award.playerId;
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "inbox",
      `${award.icon} ${who} verdient ${award.label}`,
    );
    if (named) {
      const summit = processSummitBreakout(
        named,
        award.stampId,
        nextWeek,
        session.masterSeed,
        session.season,
      );
      players = players.map((entry) => (entry.id === named.id ? summit.player : entry));
      clubEvents = appendBreakoutNarrativesToEvents(
        clubEvents,
        summit.narratives,
        session.season,
        nextWeek,
      );
    }
  }
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
  players = advanceMentorshipWeek(players, session.season, nextWeek);

  const advanced = advanceInboxWeek(
    session.youthInbox,
    players,
    nextWeek,
    session.masterSeed,
    youth.report,
  );
  const trialStep = advanceProTrials(advanced.players, session.clubId, session.season, nextWeek);
  let playersWithMorale = applyDepartureMoralePressure(trialStep.players, advanced.inbox);
  if (trainingPlanNeglected) {
    playersWithMorale = applyTrainingNeglectMorale(playersWithMorale, session.clubId);
  }
  const isHomeMatchWeek =
    leagueStep.playerFixture?.homeTeamId === session.league.player_club_id;
  const occupancy = weekCommerceOccupancy(
    isHomeMatchWeek,
    session.stadium,
    session.season,
    session.week,
  );
  const merchAdvance = advanceMerchandisingWeek(session.stadium, {
    stadium: session.stadium,
    players: playersWithMorale,
    clubId: session.clubId,
    occupancy,
    isHomeMatchWeek,
    week: nextWeek,
    season: session.season,
    masterSeed: session.masterSeed,
  });
  for (const summary of merchAdvance.saleSummaries) {
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "finance",
      merchSaleSummaryClubEventMessage(summary),
    );
  }
  for (const disposal of merchAdvance.stockDisposals) {
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "finance",
      merchStockDisposalClubEventMessage(disposal),
    );
  }
  const fanbaseDelta =
    weeklyFanbaseDelta(
      leagueWithCareerStats,
      session.clubId,
      leagueStep.playerFixture != null,
    ) +
    precinctWeeklyFanbaseBonus(merchAdvance.stadium.precinct, occupancy) +
    (trainingPlanNeglected ? TRAINING_NEGLECT_FANBASE_PENALTY : 0);
  const stadiumAfterFanbase = (() => {
    let stadium = advanceClubFanbase(merchAdvance.stadium, fanbaseDelta);
    const blockAdvance = advanceBlockExpansionProjects(stadium, session.season, nextWeek);
    stadium = normalizeClubStadium(blockAdvance.stadium);
    for (const completion of blockAdvance.completions) {
      const total = stadiumTotalCapacity(stadium, session.season, nextWeek);
      clubEvents = withClubEvent(
        clubEvents,
        session.season,
        nextWeek,
        "inbox",
        `${completion.blockName}: Tribünenausbau fertig — ${completion.capacity.toLocaleString("de-DE")} Plätze (Stadion gesamt ${total.toLocaleString("de-DE")}).`,
      );
    }
    const precinct = stadium.precinct;
    if (precinct) {
      const now = careerWeekIndex(session.season, nextWeek);
      const precinctAdvance = advancePrecinctConstructionDetailed(precinct, now);
      for (const completion of precinctAdvance.completions) {
        clubEvents = withClubEvent(
          clubEvents,
          session.season,
          nextWeek,
          "inbox",
          `${completion.label}: Bau abgeschlossen — Anlage ist betriebsbereit.`,
        );
      }
      stadium = { ...stadium, precinct: precinctAdvance.state };
    }
    return stadium;
  })();
  const megaEvent = maybeStadiumMegaEventWeek(
    stadiumAfterFanbase,
    session.season,
    nextWeek,
    session.masterSeed,
  );
  if (megaEvent.message) {
    clubEvents = withClubEvent(clubEvents, session.season, nextWeek, "info", megaEvent.message);
  }
  let stadium = normalizeClubStadium(megaEvent.stadium);
  let youthCamps = session.youthCamps;
  let academyFacility = session.academyFacility;
  let academyProject = session.academyProject ?? null;
  const construction = advanceCareerConstruction({
    stadium,
    youthCamps,
    academyFacility,
    academyProject,
    players: session.players,
    clubId: session.clubId,
    season: session.season,
    week: nextWeek,
    masterSeed: session.masterSeed,
    clubEvents,
  });
  stadium = construction.stadium;
  youthCamps = construction.youthCamps;
  academyFacility = construction.academyFacility;
  academyProject = construction.academyProject;
  const constructionNewPlayers = construction.newPlayers;
  clubEvents = construction.clubEvents;
  const opponentId =
    isHomeMatchWeek && leagueStep.playerFixture
      ? leagueStep.playerFixture.awayTeamId
      : null;
  const ownFans = stadium.fanbase ?? DEFAULT_FANBASE;
  const hotelOcc = hotelOccupancyPct(
    ownFans,
    isHomeMatchWeek,
    opponentId ? clubFlavorFanbase(opponentId) : DEFAULT_FANBASE,
  );
  const restOcc = restaurantOccupancyPct(
    ownFans,
    restaurantViralActive(stadium.restaurant_viral_until_week, session.season, nextWeek),
  );
  const hospitalityIncome =
    weeklyHotelIncome(stadium.precinct, hotelOcc) + weeklyRestaurantIncome(stadium.precinct, restOcc);
  const overtimeDue =
    stadium.restaurant_overtime_week === careerWeekIndex(session.season, nextWeek)
      ? RESTAURANT_OVERTIME_COST
      : 0;
  const financeStep = advanceWeeklyClubFinances(session.finances, {
    players: playersWithMorale,
    clubId: session.clubId,
    divisionId: session.league.division_id,
    isHomeMatchWeek,
    season: session.season,
    week: nextWeek,
    stadium,
    coachingStaff: session.coachingStaff,
    scoutWagesWeekly: scoutNetworkWeeklyWage(session.scoutNetwork),
    medicalWagesWeekly: medicalStaffWageBill(session.medicalStaff),
    campUpkeepWeekly: weeklyCampUpkeep(youthCamps),
    hospitalityIncome,
    overtimeCost: overtimeDue,
    commerceOccupancy: occupancy,
    merchandisingNet: merchAdvance.economics.net,
  });
  const loanStep = advanceWeeklyLoanServicing(
    financeStep.finances,
    session.financing,
    session.season,
    nextWeek,
  );
  const crisisStep = advanceFinancialCrisisWeek(
    loanStep.finances,
    loanStep.financing,
    board,
    nextWeek,
  );
  const finances = crisisStep.finances;
  let financingAfterLoans = crisisStep.financing;
  board = crisisStep.board;
  const playersWithGrowth = stampWeeklyGrowthBatch(playersAtWeekStart, playersWithMorale);
  let playersWithCaStamp = playersWithGrowth.map(stampLastWeekCa);

  const seasonEnded = footballSeasonEnded;
  let rivalPlayers = advanceRivalGrowthWeek(
    session.rivalPlayers,
    session.season,
    nextWeek,
    session.masterSeed,
    leagueStep.matchdayPlayed > 0,
  );
  if (leagueStep.matchdayPlayed > 0 && leagueStep.matchdayPlayerStats.length > 0) {
    rivalPlayers = applyRivalMatchdayStats(
      rivalPlayers,
      leagueStep.matchdayPlayerStats,
      leagueStep.league.player_club_id,
    );
  }
  const rivalBreakouts = processWeeklyBreakoutChecks(
    rivalPlayers,
    nextWeek,
    session.masterSeed,
    session.season,
  );
  rivalPlayers = expireBreakoutModifiers(rivalBreakouts.players, nextWeek);
  rivalPlayers = evaluateClearStamps(rivalPlayers).players;
  const rivalBreakoutNarratives = rivalBreakouts.narratives;

  let transferState = session.transferState;
  clubEvents = appendBreakoutNarrativesToEvents(
    clubEvents,
    breakouts.narratives,
    session.season,
    nextWeek,
  );
  for (const narrative of rivalBreakoutNarratives) {
    const rival = rivalPlayers.find((entry) => entry.id === narrative.playerId);
    const who = rival ? formatPlayerName(rival) : narrative.playerId;
    clubEvents = withClubEvent(
      clubEvents,
      session.season,
      nextWeek,
      "info",
      `Formexplosion: ${who} — ${narrative.narrative}`,
    );
  }
  if (isTransferWindowOpen(nextWeek)) {
    const aiTransfers = advanceAiTransferWeek({
      rivalPlayers,
      transferState,
      leagueClubIds: leagueWithCareerStats.club_ids,
      divisionId: leagueWithCareerStats.division_id,
      season: session.season,
      week: nextWeek,
      masterSeed: session.masterSeed,
      worldClubs: session.world.clubs,
    });
    rivalPlayers = aiTransfers.rivalPlayers;
    transferState = aiTransfers.transferState;
    for (const message of aiTransfers.messages) {
      clubEvents = withClubEvent(
        clubEvents,
        session.season,
        nextWeek,
        "transfer",
        t("clubEvent.transferAi", { message }),
      );
    }
    const inbound = scanInboundOffers({
      players: playersWithCaStamp,
      clubId: session.clubId,
      season: session.season,
      week: nextWeek,
      masterSeed: session.masterSeed,
      leagueClubIds: leagueWithCareerStats.club_ids,
      transferState,
    });
    transferState = inbound.transferState;
    transferState = refreshAiListings({
      state: transferState,
      players: [...playersWithCaStamp, ...rivalPlayers],
      userClubId: session.clubId,
      season: session.season,
      week: nextWeek,
      masterSeed: session.masterSeed,
      leagueClubIds: leagueWithCareerStats.club_ids,
    });
    const listingBids = scanListingBids({
      state: transferState,
      players: playersWithCaStamp,
      userClubId: session.clubId,
      season: session.season,
      week: nextWeek,
      masterSeed: session.masterSeed,
      leagueClubIds: leagueWithCareerStats.club_ids,
    });
    transferState = listingBids.state;
    if (listingBids.opened) {
      clubEvents = withClubEvent(
        clubEvents,
        session.season,
        nextWeek,
        "transfer",
        "Angebot für einen angebotenen Spieler liegt in den Verhandlungen.",
      );
    }
    for (const offer of inbound.newOffers) {
      clubEvents = withClubEvent(
        clubEvents,
        session.season,
        nextWeek,
        "transfer",
        t("clubEvent.inboundOffer", {
          fee: offer.fee,
          playerId: offer.player_id,
        }),
      );
    }
  }

  const calendar = {
    season: seasonEnded ? session.season + 1 : session.season,
    week: nextWeek,
    weekday: 1,
  };
  const underpaidPrompts: UnderpaidInboxPrompt[] = [];
  playersWithCaStamp = playersWithCaStamp.map((player) => {
    if (player.club_id !== session.clubId) return player;
    const step = advanceUnderpaidContractWeek(player, session.season, calendar);
    if (step.newPromptMonth) {
      underpaidPrompts.push({ playerId: player.id, month: step.newPromptMonth });
    }
    return step.player;
  });
  const youthInboxWithUnderpaid = enqueueUnderpaidRenegotiateItems(
    advanced.inbox,
    underpaidPrompts,
    nextWeek,
    playersWithCaStamp,
    session.clubId,
  );

  const scoutBoard = reconcileScoutBoard(
    advanceScoutWeek(
      session.scoutBoard,
      nextWeek,
      rivalPlayers,
      session.world.clubs,
      session.scoutNetwork,
      session.season,
      session.league.division_id,
    ),
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
  const narrativeStep = advanceNarrativeWeek(
    {
      ...session,
      board,
      season: seasonEnded ? session.season + 1 : session.season,
      week: nextWeek,
      players: playersWithCaStamp,
      scoutBoard,
      youthInbox: youthInboxWithUnderpaid,
      league: leagueWithCareerStats,
      finances,
      stadium,
      rivalPlayers,
      transferState,
      clubEvents,
      individualPrograms: individualStep.programs,
      storyState: session.storyState,
      financing: financingAfterLoans,
    },
    leagueStep.playerFixture,
  );

  const financingOfferStep = advanceFinancingStoryOffersWeek({
    ...session,
    board: narrativeStep.board,
    youthInbox: narrativeStep.youthInbox,
    finances,
    stadium: narrativeStep.stadium,
    storyState: narrativeStep.storyState,
    financing: financingAfterLoans,
    season: seasonEnded ? session.season + 1 : session.season,
    week: nextWeek,
  });
  financingAfterLoans = financingOfferStep.financing;

  const nextSeason = seasonEnded ? session.season + 1 : session.season;
  const stadiumAfterNaming = revertExpiredNamingRights(narrativeStep.stadium, nextSeason);
  const playersForNewWeek = stampWeekStartAttributesBatch(
    [...narrativeStep.players, ...constructionNewPlayers],
    nextSeason,
    nextWeek,
  );

  const campAdvance = advanceYouthCampsForWeek({
    camps: session.youthCamps,
    season: nextSeason,
    week: nextWeek,
    clubId: session.clubId,
    masterSeed: session.masterSeed,
    players: playersForNewWeek,
    facility: session.academyFacility ?? "academy_basic",
  });
  for (const completion of campAdvance.constructionCompletions) {
    clubEvents = withClubEvent(
      clubEvents,
      nextSeason,
      nextWeek,
      "inbox",
      `${completion.flag} Camp ${completion.nationLabel}: Bau abgeschlossen — Camp ist eröffnet.`,
    );
  }
  let playersAfterCampOpen = playersForNewWeek;
  if (campAdvance.newPlayers.length > 0) {
    playersAfterCampOpen = refreshAllMarketValues(
      [...playersForNewWeek, ...campAdvance.newPlayers],
      nextSeason,
    );
    for (const debut of campAdvance.debuts) {
      const nation = campNationById(debut.campId);
      const headline = playersAfterCampOpen.find((entry) => entry.id === debut.playerId);
      if (headline && nation) {
        clubEvents = withClubEvent(
          clubEvents,
          session.season,
          nextWeek,
          "info",
          `${nation.flag} Camp ${nation.label}: ${formatPlayerName(headline)} stellt sich vor — drei Talente im Kader.`,
        );
      }
    }
  }

  let nextSession: GameSession = {
    ...session,
    season: nextSeason,
    week: nextWeek,
    players: playersAfterCampOpen,
    youthCamps: campAdvance.camps,
    scoutBoard,
    youthInbox: financingOfferStep.youthInbox,
    league: leagueWithCareerStats,
      finances,
      financing: financingAfterLoans,
      stadium: stadiumAfterNaming,
      board: narrativeStep.board,
    trainingPlan: resolveTrainingPlanAfterWeek(narrativeStep.storyState),
    trainingReminderWeek: undefined,
    trainingUnitsCompleted: 0,
    trainingUnitOutcomes: [],
    trainingCalendarGateDone: resolveFeatureCurtain(narrativeStep.storyState).auto_training,
    rivalPlayers,
    rivalBreakoutNarratives,
    academyFacility,
    academyProject,
    transferState,
    clubEvents,
    individualPrograms: individualStep.programs,
    storyState: narrativeStep.storyState,
    medicalState: startPhysioWeek(
      session.medicalState,
      playersAfterCampOpen,
      nextSeason,
      nextWeek,
      precinctMedicalCenterLevel(stadiumAfterNaming.precinct),
    ),
    medicalStaff: session.medicalStaff,
    orthopedistHire: session.orthopedistHire,
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
    campDebuts: campAdvance.debuts,
  };
}
