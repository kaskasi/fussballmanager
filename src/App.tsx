import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IndividualProgram } from "./development/individual-training.ts";
import { assignIndividualProgram } from "./development/individual-training.ts";
import { needsTrainingPlanForToday } from "./development/training-plan-state.ts";
import {
  isNavScreenVisible,
  resolveFeatureCurtain,
  resolvePresentationMode,
  type CurtainNavScreen,
} from "./narrative/career-presentation.ts";
import type { StoryState } from "./narrative/story-state.ts";
import type { TrainingPlanPresetSlot } from "./development/training-plan-presets.ts";
import type { TrainingSlot } from "./development/training-units.ts";
import { CareerMatch } from "./match/CareerMatch";
import { buildBroadcastStoryContext } from "./match/broadcast-story-context.ts";
import { appendMatchdayClubEvents } from "./match/post-match-events.ts";
import { Matchday } from "./match/Matchday";
import {
  newGameSession,
  saveFromSession,
  sessionFromSave,
} from "./persistence/game-session.ts";
import {
  createScoutAssignment,
} from "./scouting/scout-assignments.ts";
import {
  activeScoutCount,
  addScoutAssignment,
  assignScout,
  advanceScoutWorkingDay,
  getBoardTarget,
  listBoardTargets,
  toggleScoutAssignment,
} from "./scouting/scout-board.ts";
import {
  requestScoutWorkCancel,
  type ScoutWorkCancelTarget,
} from "./scouting/scout-work-cancel.ts";
import {
  canStartRegionScout,
  normalizeDiscovery,
  startRegionScoutJob,
} from "./scouting/scout-discovery.ts";
import { buildZoneMapNodes, layoutForZone } from "./scouting/scout-map-layout.ts";
import { buildScoutDiscoveryMapModel } from "./scouting/scout-region-map.ts";
import {
  canEnqueueScoutTrip,
  dispatchQueuedScoutTrips,
  enqueueScoutTrip,
} from "./scouting/scout-trip-queue.ts";
import type { ScoutRouteScore } from "./scouting/scout-route-puzzle.ts";
import { worldCareerClubId, type WorldDivisionId } from "./world/world-generator.ts";
import { clubLogoUrlForPlayerClub } from "./ui/assets/club-logo.ts";
import { joinDocumentTitle, useDocumentTitle } from "./ui/document-title.ts";
import { prepareCareerMatch, type CareerMatchSetup } from "./sim/career-match-setup.ts";
import {
  buildOpponentScoutWorkingDayContext,
  startOpponentScoutJob,
} from "./scouting/opponent-scout-job.ts";
import type { WatchedPlayerMatch } from "./sim/watched-player-match.ts";
import { MONDAY, resolveSmartSkip } from "./sim/day-calendar.ts";
import { archiveKickerEdition } from "./inbox/kicker-edition-archive.ts";
import { kickerItemId, parseKickerItemId } from "./inbox/kicker-inbox.ts";
import {
  hasInboxBlockerForNext,
  shouldNavigateToCalendarBeforeTimeStep,
  shouldOpenLineupFromCalendar,
} from "./ui/nav-next-flow.ts";
import { formatSeasonLabel } from "./sim/season-label.ts";
import { simulateGameWeek } from "./sim/week-pipeline.ts";
import {
  fastForwardToMonthEnd,
  sessionAfterWeekSimulation,
} from "./sim/fast-forward-to-month.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
  trainingWeekSlotsRemaining,
  usesTrainingNextNexus,
} from "./sim/training-next.ts";
import {
  shouldPauseTrainingAutoNext,
  TRAINING_AUTO_NEXT_INTERVAL_MS,
} from "./sim/training-auto-next.ts";
import { attributeLabel } from "./ui/player-profile.ts";
import type { Attributes } from "./types/player.ts";
import { isTransferWindowOpen } from "./sim/transfer-windows.ts";
import {
  applyTransferFee,
  canAffordTransfer,
  formatClubCash,
  creditClubCash,
  spendClubCash,
  transferBudget,
  wageBudgetHeadroom,
  weeklyWageBill,
  leagueTablePlace,
} from "./economy/club-finances.ts";
import { formatPlayerName } from "./types/player-display.ts";
import { sellerAskingPrice, toggleShortlist } from "./transfers/negotiations.ts";
import { unsolicitedAskingPrice, unsolicitedRefusalReason } from "./transfers/unsolicited-approach.ts";
import { useTransferNegotiation } from "./ui/components/TransferNegotiationHost.tsx";
import { SpendConfirmSheet } from "./ui/components/SpendConfirmSheet.tsx";
import { constructionSnapshotFromSession } from "./sim/advance-construction.ts";
import {
  infrastructureCostForWeek,
  isEarlyCapitalSeason,
  needsInfrastructureSpendConfirm,
} from "./economy/early-pacing.ts";
import {
  boardCashFloor,
  needsSpendConfirm,
  spendRunway,
  weeksOfWages,
} from "./economy/spend-runway.ts";
import { drawBankLoan, evaluateBankLoan } from "./economy/financing.ts";
import { isFinancingStoryChannel } from "./economy/financing-channels.ts";
import { applyFinancingStoryChoice } from "./economy/financing-apply.ts";
import type { DivisionEconomyId } from "./economy/division-economy.ts";
import { matchdayCashBreakdown } from "./stadium/matchday-commerce.ts";
import {
  attemptPreContract,
  canSignPreContract,
  preContractOffer,
} from "./transfers/pre-contracts.ts";
import { careerTeamId } from "./sim/rival-growth.ts";
import {
  appendTransferRecord,
  createPurchaseRecord,
  loanOutMessage,
  loanReturnMessage,
} from "./transfers/transfer-history.ts";
import { recallLoanPlayer } from "./transfers/loans.ts";
import {
  submitContractOffer,
  wageDeltaFitsBudget,
  type ContractOffer,
} from "./transfers/contract-talks.ts";
import { loanClubName } from "./transfers/loan-roster.ts";
import { canSellPlayer, estimateSaleOffer } from "./transfers/player-sales.ts";
import {
  isPlayerListed,
  listPlayerForSale,
  unlistPlayer,
} from "./transfers/transfer-listings.ts";
import { COACH_ROLE_LABELS, hireCoach, type Coach } from "./staff/coaching-staff.ts";
import {
  applyAssistantDelegationWeek,
  assistantQuality,
  normalizeAssistantDelegation,
  type AssistantDelegation,
  type AssistantDelegationTask,
} from "./staff/assistant-delegation.ts";
import { assignMentor, clearMentor } from "./development/mentoring.ts";
import {
  fireScout,
  canHireScout,
  hireScout,
  scoutNetworkCapacity,
  type HiredScout,
} from "./scouting/scout-network.ts";
import { FirstTeam } from "./ui/screens/FirstTeam.tsx";
import { FinancesScreen } from "./ui/screens/FinancesScreen.tsx";
import { MerchandisingScreen } from "./ui/screens/MerchandisingScreen.tsx";
import {
  buyBulkOffer,
  deliverMerchandisingOrders,
  ensureMerchBulkMarket,
  orderMerchOnDemand,
  canAffordMerchPurchase,
  hasMerchStockout,
  startMerchSkuSale,
  type MerchSkuId,
} from "./economy/merchandising.ts";
import { ClubEventsScreen } from "./ui/screens/ClubEventsScreen.tsx";
import { StadiumScreen } from "./ui/screens/StadiumScreen.tsx";
import { standings, type SandboxPlan, type TeamId } from "@fussballmanager/shared";
import { jobOfferForTeam, listJobOffers } from "./board/job-offers.ts";
import { isCareerTransitionPending } from "./narrative/career-acts.ts";
import {
  acceptStoryEmployerOffer,
  storyFollowerNames,
} from "./narrative/career-transition.ts";
import { StoryActTransitionModal } from "./ui/components/StoryActTransitionModal.tsx";
import { acceptJobOffer } from "./board/accept-job-offer.ts";
import { applyCompanionPick, isCompanionPickBeat } from "./board/companion-pick.ts";
import {
  applyScoutPlanToMatchLineup,
  fillMissingAssignments,
  lineupAssignmentsEqual,
  type MatchLineupState,
} from "./match/lineup-board.ts";
import { saveTacticsPreset, type TacticsPresetId } from "./match/tactics-presets.ts";
import { JobOffersModal } from "./ui/components/JobOffersModal.tsx";
import {
  DEFAULT_FANBASE,
  STADIUM_BASE_BLOCKS,
  normalizeClubStadium,
  stadiumTotalCapacity,
  type ClubStadium,
} from "./stadium/club-stadium.ts";
import { clubDisplayName, clubShortLabel, worldClubForTeam } from "./sim/league-divisions.ts";
import { clubFlavorFanbase } from "./sim/club-profiles.ts";
import { playerFixture } from "./sim/league-week.ts";
import { fanbaseMood } from "./stadium/fanbase.ts";
import { teamForm } from "./sim/league-form.ts";
import { teamPoorRecentForm } from "./ui/assets/mood-photos.ts";
import {
  canPurchaseStadiumUpgrade,
  purchaseStadiumUpgrade,
  stadiumUpgradeCatalog,
} from "./stadium/stadium-upgrades.ts";
import {
  canStartBlockExpansion,
  startBlockExpansion,
} from "./stadium/stadium-block-expansion.ts";
import {
  buyPrecinctExpansion,
  canBuyPrecinctExpansion,
  canNudgePrecinctPatch,
  canUpgradePrecinctBuilding,
  emptyPrecinct,
  nudgePrecinctPatch,
  placePrecinctBuilding,
  placeStreetRun,
  removePrecinctPatch,
  removeStreetCell,
  precinctHasTrainingHall,
  precinctTrainingPitchLevel,
  precinctPlacementCost,
  PRECINCT_BUILDINGS,
  shrinkPrecinctPatchToMin,
  upgradePrecinctBuilding,
  occupiedCells,
  type PrecinctBuilding,
  type PrecinctEdge,
} from "./stadium/precinct.ts";
import { applyRestaurantProposalStory } from "./stadium/precinct-campus-events.ts";
import { careerInjuryRiskFactor } from "./medical/career-injury-risk.ts";
import { tickMedicalSessionDay, tickMedicalSessionDays } from "./medical/medical-session.ts";
import {
  applyRehabMinigameBonus,
  applyPendingRowToPlayer,
  extendInjuryWeeks,
  reduceInjuryWeeks,
} from "./medical/diagnosis-queue.ts";
import {
  completeDoctorExam,
  completeInHouseSurgery,
  countMedicalHeaderAlerts,
  ensurePhysioWeek,
  markPhysioManualDone,
} from "./medical/injury-care.ts";
import { medicalModifiers, normalizeMedicalStaff } from "./staff/medical-staff.ts";
import { precinctMedicalCenterLevel } from "./stadium/precinct-effects.ts";
import {
  clearOrthopedistHireAfterPick,
  isOrthopedistPostfachItemId,
  orthopedistAwaitingPostfach,
  orthopedistFromCandidate,
  orthopedistPostfachItemId,
  type OrthopedistCandidate,
} from "./medical/orthopedist-hire.ts";
import {
  hireMedicalDoctor,
  hireMedicalPhysio,
  hireMedicalOrthopedist,
  type MedicalMember,
} from "./staff/medical-staff.ts";
import { MedicalCenterScreen } from "./ui/screens/MedicalCenterScreen.tsx";
import { TransfersScreen } from "./ui/screens/TransfersScreen.tsx";
import { HelpScreen } from "./ui/screens/HelpScreen.tsx";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
import { LeaguesScreen } from "./ui/screens/LeaguesScreen.tsx";
import { ClubProfileModal } from "./ui/components/ClubProfileModal.tsx";
import { TrainingCenter } from "./ui/screens/TrainingCenter.tsx";
import { PlayerProfile } from "./ui/screens/PlayerProfile";
import {
  DEFAULT_MARKET_FILTERS,
  DEFAULT_MARKET_SORT,
  type MarketFilters,
  type MarketSort,
} from "./scouting/market-list.ts";
import { ScoutingCenter, type ScoutingInitialTab } from "./ui/screens/ScoutingCenter";
import { CampLeaderDismissModal } from "./ui/components/CampLeaderDismissModal.tsx";
import { postfachOpenCount } from "./inbox/postfach-open-count.ts";
import { isScoutJobPostfachItemId } from "./inbox/postfach-scout-job.ts";
import {
  consumeScoutJobNotice,
  scoutJobNoticeById,
  unconsumedScoutJobNotices,
} from "./scouting/scout-job-postfach.ts";
import { scoutJobDismissOneLiner } from "./inbox/postfach-archive.ts";
import { PostfachScreen } from "./ui/screens/PostfachScreen.tsx";
import { downloadSaveAsFile } from "./persistence/save-transfer.ts";
import { NoticeToast, SaveDirtyBanner, SaveToast } from "./ui/components/SaveToast.tsx";
import { CampOpeningDebutModal } from "./ui/components/CampOpeningDebutModal.tsx";
import { YouthCampus, type YouthCampusSortState } from "./ui/screens/YouthCampus";
import { CalendarScreen } from "./ui/screens/CalendarScreen.tsx";
import {
  collectCalendarMilestones,
  filterCalendarMilestonesForReveal,
} from "./ui/calendar/calendar-milestones.ts";
import { canBuyAcademyUpgrade, ACADEMY_FACILITIES } from "./youth/academy.ts";
import {
  CAMP_LEADER_AGENCY_NOTICE,
  campsAwaitingLeaderChoice,
  commissionCampLeaderAgency,
  dismissCampLeader,
  hireCampLeader,
  tickCampLeaderHires,
  type CampLeaderCandidate,
} from "./youth/camp-leader-hire.ts";
import { campLeaderPostfachItemId } from "./inbox/postfach-camp-leader.ts";
import { refreshAllMarketValues } from "./transfers/refresh-market-values.ts";
import {
  applyProfileActionToSquad,
  canReleasePlayer,
  contractTerminationPayout,
  type PlayerProfileAction,
} from "./player/profile-actions.ts";
import { ACHIEVEMENT, grantAchievement } from "./player/achievements.ts";
import { withClubEvent, type ClubEventKind } from "./inbox/club-events.ts";
import {
  actionLabel,
  applyInboxDecision,
  deliverDailyInbox,
  deliverInboxForDays,
  inboxActionOpensContractTalk,
  isStoryInboxItem,
  pendingInboxItems,
  storyChoiceId,
  type DecisionAction,
} from "./youth/decision-inbox.ts";
import { completeOpening, openingBlocked } from "./narrative/opening.ts";
import { localizeStoryInbox } from "./i18n/story-display.ts";
import { resolveStoryInboxDecision } from "./narrative/pipeline-week.ts";
import type { CareerOrigin } from "./narrative/story-state.ts";
import { OpeningStoryModal } from "./ui/components/OpeningStoryModal.tsx";
import type { NavPrimaryAction } from "./ui/nav-primary-action.ts";
import { t } from "./i18n/index.ts";
import { useLocale } from "./i18n/react.ts";
import {
  applyAccessibilityPreferences,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from "./ui/accessibility.ts";
import { AppChrome } from "./ui/shell/AppChrome.tsx";
import {
  SCREEN_DOCUMENT_TITLE_KEYS,
  type HubNavActions,
  type Screen,
} from "./ui/shell/types.ts";
import { useCareerMatchFlow } from "./ui/actions/useCareerMatchFlow.ts";
import { useWeekAdvance } from "./ui/actions/useWeekAdvance.ts";
import { CareerMatchLiveShell } from "./ui/shell/CareerMatchLiveShell.tsx";
import { PortraitKitProvider } from "./ui/portraits/PortraitKitContext.tsx";
import { GameScreenRouter } from "./ui/shell/GameScreenRouter.tsx";
import { clearTransientUi } from "./ui/shell/bootstrap.ts";
import { usePersistedGameSession } from "./ui/session/usePersistedGameSession.ts";
import { useScoutingActions } from "./ui/actions/useScoutingActions.ts";
import { useTrainingActions } from "./ui/actions/useTrainingActions.ts";
import { useMedicalActions } from "./ui/actions/useMedicalActions.ts";
import { useYouthCampActions } from "./ui/actions/useYouthCampActions.ts";
import { GameSessionProvider } from "./ui/session/GameSessionContext.tsx";
import { TutorialCoachLayer } from "./ui/tutorial/TutorialCoachLayer.tsx";
import { TutorialUiProvider } from "./ui/tutorial/TutorialUiContext.tsx";
import { useMerchActions } from "./ui/actions/useMerchActions.ts";
import { useStadiumActions } from "./ui/actions/useStadiumActions.ts";
import type { LocaleId } from "./i18n/locale-id.ts";
import { MANAGER_DESK_HUB_ENABLED } from "./hub/config.ts";
import { hubBlockerCount } from "./hub/hub-blockers.ts";
import { initAnalytics, trackScreen } from "./telemetry/analytics.ts";
import { weekContextLabel } from "./telemetry/context.ts";
import { committedTransferFees, scheduledTransferReason } from "./transfers/scheduled-transfers.ts";

export default function App() {
  const locale = useLocale();
  const [screen, setScreen] = useState<Screen>("hub");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileOpenContractTalk, setProfileOpenContractTalk] = useState(false);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [postfachItemId, setPostfachItemId] = useState<string | null>(null);
  const [campLeaderDismissCampId, setCampLeaderDismissCampId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const {
    careerMatchSetup,
    setCareerMatchSetup,
    careerMatchUiVisible,
    setCareerMatchUiVisible,
    careerMatchInLineupRef,
    matchLineupPrepKeyRef,
    careerMatchFlowRef,
    matchNavAction,
    matchNavActionRef,
    setMatchNavAction,
    matchSkipToReport,
    registerMatchSkipToReport,
  } = useCareerMatchFlow();
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [marketSort, setMarketSort] = useState<MarketSort>(DEFAULT_MARKET_SORT);
  const [trainingFocusPlayerId, setTrainingFocusPlayerId] = useState<string | null>(null);
  const [clubProfileId, setClubProfileId] = useState<TeamId | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() =>
    loadAccessibilityPreferences(),
  );
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [campusInitialTab, setCampusInitialTab] = useState<"u17" | "u19" | "camps" | null>(null);
  const [campusTab, setCampusTab] = useState<"u17" | "u19" | "camps">("u17");
  const [campusYouthSort, setCampusYouthSort] = useState<YouthCampusSortState>({
    key: "position",
    direction: "asc",
  });
  const [trainingAutoNext, setTrainingAutoNext] = useState(false);
  const [scoutingInitialTab, setScoutingInitialTab] = useState<ScoutingInitialTab | null>(null);
  const scoutMapDetailBackRef = useRef<(() => void) | null>(null);
  const [scoutMapDetailNav, setScoutMapDetailNav] = useState<{
    onBack: () => void;
    title: string;
  } | null>(null);
  const [pendingWatchedMatch, setPendingWatchedMatch] = useState<WatchedPlayerMatch | null>(null);
  const [pendingSpend, setPendingSpend] = useState<{
    title: string;
    cost: number;
    earlySeasonHint: boolean;
    construction: boolean;
    apply: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>;
  } | null>(null);
  const [campDebutReveal, setCampDebutReveal] = useState<{
    campId: string;
    playerId: string;
  } | null>(null);

  useEffect(() => {
    setProfileFeedback(null);
  }, [profileId, foreignPlayerId]);

  useEffect(() => {
    if (screen !== "training") {
      setTrainingFocusPlayerId(null);
    }
  }, [screen]);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashNotice = useCallback((text: string, tone: "ok" | "warn" = "warn") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ text, tone });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  const clearSlotUi = useCallback(() => {
    clearTransientUi({
      setProfileId,
      setForeignPlayerId,
      setPostfachItemId,
      setProfileFeedback,
      setCareerMatchSetup,
      setCareerMatchUiVisible,
      setMatchNavAction,
      setMarketFilters,
      setMarketSort,
      setScreen,
    });
  }, [setMatchNavAction]);

  const {
    save,
    setSave,
    activeSlot,
    session,
    patchSession,
    replaceSave,
    sessionWithEvent,
    saveToastVisible,
    persistDirty,
    resetGame,
    loadSaveSlot,
    newGameInSlot,
    applyCloudSave,
    applyImportedSave,
    sessionReady,
  } = usePersistedGameSession({
    flashNotice,
    onSlotChange: clearSlotUi,
  });

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    applyAccessibilityPreferences(accessibility);
    saveAccessibilityPreferences(accessibility);
    initAnalytics(accessibility);
  }, [accessibility]);

  useEffect(() => {
    if (screen !== "scouting") {
      scoutMapDetailBackRef.current = null;
      setScoutMapDetailNav(null);
    }
  }, [screen]);

  const {
    season,
    week,
    weekday,
    players,
    trainingPlan,
    trainingPlanPresets,
    trainingIntensity,
    individualPrograms,
    scoutBoard,
    youthInbox,
    league,
    transferState,
    finances,
    stadium,
    tacticsPresets,
    matchLineup,
    board,
    clubEvents,
    rivalPlayers,
    coachingStaff,
    masterSeed,
    world,
    lastSeasonAwards,
    storyState,
    assistantDelegation,
    scoutNetwork,
    academyFacility,
    youthCamps,
    trainingUnitsCompleted,
    trainingUnitOutcomes,
    financing,
    medicalStaff,
    medicalState,
    orthopedistHire,
  } = session;

  const prevScreenRef = useRef<Screen | null>(null);
  useEffect(() => {
    trackScreen(screen, {
      previous_screen: prevScreenRef.current,
      week_context: weekContextLabel(season, week, weekday, activeSlot),
    });
    prevScreenRef.current = screen;
  }, [activeSlot, screen, season, week, weekday]);

  useEffect(() => {
    document.documentElement.dataset.presentation = resolvePresentationMode(storyState);
  }, [storyState]);

  const injuryRiskFactor = useMemo(
    () => careerInjuryRiskFactor(stadium.precinct, medicalStaff),
    [medicalStaff, stadium.precinct],
  );
  const orthopedistPostfachOpen = orthopedistAwaitingPostfach(
    orthopedistHire,
    Boolean(medicalStaff.orthopedist),
  );
  const medicalAttentionCount = useMemo(
    () =>
      countMedicalHeaderAlerts(
        medicalState,
        players.filter((p) => p.club_id === session.clubId && p.squad_status === "pro"),
        season,
        week,
        precinctMedicalCenterLevel(stadium.precinct),
      ),
    [medicalState, players, season, week, session.clubId, stadium.precinct],
  );
  const playerDivisionId = useMemo((): WorldDivisionId => {
    const club = world.clubs.find((entry) => worldCareerClubId(entry.id) === session.clubId);
    return club?.division_id ?? "regionalliga-nord";
  }, [session.clubId, world.clubs]);

  const shellClub = useMemo(() => {
    const teamId = league.player_club_id;
    const table = standings(league.club_ids, league.results);
    const placeIndex = table.findIndex((row) => row.teamId === teamId);
    return {
      name: clubDisplayName(teamId, world.clubs),
      initials: clubShortLabel(teamId, world.clubs),
      logoSrc: clubLogoUrlForPlayerClub(teamId),
      kit: worldClubForTeam(teamId, world.clubs)?.kit,
      leaguePlace: placeIndex >= 0 ? placeIndex + 1 : null,
    };
  }, [world.clubs, league.player_club_id, league.club_ids, league.results]);

  const scoutCapacity = scoutNetworkCapacity(scoutNetwork);
  const calendarMilestones = useMemo(() => {
    const collected = collectCalendarMilestones({
      season,
      week,
      weekday,
      clubId: session.clubId,
      players,
      individualPrograms,
      youthCamps,
      stadium,
    });
    return filterCalendarMilestonesForReveal(collected, season, week);
  }, [season, week, weekday, session.clubId, players, individualPrograms, youthCamps, stadium]);

  const {
    handleOpenNegotiation,
    negotiationOverlay,
    negotiationUiPhase,
    foreignProfileTarget,
  } = useTransferNegotiation({
    session,
    patchSession,
    sessionWithEvent,
    finances,
    board,
    players,
    scoutBoard,
    rivalPlayers,
    transferState,
    season,
    week,
    foreignPlayerId,
    setForeignPlayerId,
    setProfileId,
    flashNotice,
  });

  const requestClubSpend = useCallback(
    (
      cost: number,
      title: string,
      apply: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>,
      options?: { infrastructure?: boolean; construction?: boolean },
    ) => {
      const wageBill = weeklyWageBill(players, session.clubId);
      const needsConfirm = options?.infrastructure
        ? needsInfrastructureSpendConfirm(cost, session.week, wageBill)
        : needsSpendConfirm(cost, wageBill);
      if (needsConfirm) {
        setPendingSpend({
          title,
          cost,
          earlySeasonHint: Boolean(options?.infrastructure && isEarlyCapitalSeason(session.week)),
          construction: Boolean(options?.construction),
          apply,
        });
        return;
      }
      patchSession(apply);
    },
    [patchSession, players, session.clubId, session.week],
  );

  const matchLineupFlowKey = careerMatchSetup
    ? `${careerMatchSetup.matchday}-${careerMatchSetup.calendarWeek}-${careerMatchSetup.fixture.homeTeamId}-${careerMatchSetup.fixture.awayTeamId}`
    : null;

  useEffect(() => {
    if (!matchLineupFlowKey || !assistantDelegation.lineup) {
      if (!matchLineupFlowKey) {
        matchLineupPrepKeyRef.current = null;
      }
      return;
    }
    if (matchLineupPrepKeyRef.current === matchLineupFlowKey) {
      return;
    }
    matchLineupPrepKeyRef.current = matchLineupFlowKey;

    patchSession((current) => {
      const managerClubId = careerTeamId(current.league.player_club_id);
      if (current.matchLineup) {
        const filled = fillMissingAssignments(
          current.players,
          current.matchLineup.formation,
          current.matchLineup.assignments,
          managerClubId,
        );
        if (lineupAssignmentsEqual(filled, current.matchLineup.assignments)) {
          return current;
        }
        return {
          ...current,
          matchLineup: { ...current.matchLineup, assignments: filled },
        };
      }
      const delegated = applyAssistantDelegationWeek({
        delegation: { lineup: true, training: false, scouting: false },
        assistantName: current.storyState.cast.assistant_name,
        quality: assistantQuality(current.coachingStaff),
        players: current.players,
        clubId: current.clubId,
        trainingPlan: current.trainingPlan,
        scoutBoard: current.scoutBoard,
        rivalPlayers: current.rivalPlayers,
        tacticsPresets: current.tacticsPresets,
        matchLineup: undefined,
        season: current.season,
        week: current.week,
        masterSeed: current.masterSeed,
        hasPlayerFixture: true,
      });
      if (!delegated.matchLineup) return current;
      return { ...current, matchLineup: delegated.matchLineup };
    });
  }, [matchLineupFlowKey, assistantDelegation.lineup, patchSession]);

  const openPostfach = useCallback(
    (itemId?: string) => {
      const count = postfachOpenCount(
        youthInbox,
        players,
        youthCamps,
        scoutBoard,
        orthopedistHire,
        Boolean(medicalStaff.orthopedist),
      );
      const pending = pendingInboxItems(youthInbox, players);
      const campItemIds = campsAwaitingLeaderChoice(youthCamps).map((camp) =>
        campLeaderPostfachItemId(camp.id),
      );
      const scoutJobIds = unconsumedScoutJobNotices(scoutBoard).map((notice) => notice.id);
      const orthoId = orthopedistPostfachOpen ? orthopedistPostfachItemId() : null;
      if (count === 0 && !(itemId && parseKickerItemId(itemId))) return;
      if (
        itemId &&
        !pending.some((item) => item.id === itemId) &&
        !parseKickerItemId(itemId) &&
        !campItemIds.includes(itemId) &&
        !scoutJobIds.includes(itemId) &&
        itemId !== orthoId &&
        !isScoutJobPostfachItemId(itemId) &&
        !isOrthopedistPostfachItemId(itemId)
      ) {
        setPostfachItemId(null);
      } else {
        setPostfachItemId(
          itemId ?? pending[0]?.id ?? campItemIds[0] ?? orthoId ?? scoutJobIds[0] ?? null,
        );
      }
      setProfileId(null);
      setForeignPlayerId(null);
      setProfileFeedback(null);
      setScreen("postfach");
    },
    [medicalStaff.orthopedist, orthopedistHire, orthopedistPostfachOpen, players, scoutBoard, youthCamps, youthInbox],
  );

  const {
    handleDismissScoutJob,
    handleStartOpponentScout,
    handleOpenOpponentScoutReport,
    handleApplyOpponentScoutPlan,
    handleAssignScout,
    handleEnqueueScoutTrip,
    handleScoutMapDetailChange,
    handleScoutRegion,
    handleHireScout,
    handleFireScout,
    handleAddScoutAssignment,
    handleCancelScoutWork,
    handleToggleScoutAssignment,
  } = useScoutingActions({
    session,
    patchSession,
    sessionWithEvent,
    marketFilters,
    flashNotice,
    careerMatchSetup,
    careerMatchUiVisible,
    setCareerMatchUiVisible,
    openPostfach,
    scoutMapDetailBackRef,
    setScoutMapDetailNav,
  });

  const {
    handleTrainingPlanChange,
    handleTrainingPlanPresetsChange,
    handleTrainingIntensityChange,
    handleIndividualProgramsChange,
    handleAssistantDelegationChange,
    handleHireCoach,
    handleAssignMentor,
    handleClearMentor,
    handleStartStampProgram,
  } = useTrainingActions({ patchSession, sessionWithEvent });

  const {
    handleHireMedicalDoctor,
    handleHireMedicalPhysio,
    handleHireOrthopedist,
    handleDoctorExamComplete,
    handleSurgery,
    handlePhysioManual,
    handleRehabMinigameComplete,
  } = useMedicalActions({ patchSession, sessionWithEvent, flashNotice });

  const {
    handleBuyYouthCamp,
    handleCommissionCampLeader,
    handleRequestDismissCampLeader,
    handleConfirmDismissCampLeader,
    handleHireCampLeader,
    handlePullCampPlayer,
  } = useYouthCampActions({
    youthCamps,
    finances,
    campLeaderDismissCampId,
    setCampLeaderDismissCampId,
    patchSession,
    requestClubSpend,
    flashNotice,
  });

  const {
    handleMerchandisingChange,
    handleMerchBulkPurchase,
    handleMerchSaleStart,
    handleMerchOnDemand,
    handleCommissionMerchExpert,
    handleHireMerchExpert,
    handleDismissMerchExpert,
  } = useMerchActions({
    screen,
    season,
    week,
    weekday,
    masterSeed,
    stadium,
    finances,
    patchSession,
    requestClubSpend,
  });

  const {
    handleDrawBankLoan,
    handlePurchaseStadiumUpgrade,
    handleStartBlockExpansion,
    handlePlacePrecinct,
    handleUpgradeAcademy,
    handleUpgradePrecinct,
    handleBuyParcel,
    handlePlaceStreet,
    handleExpandPrecinct,
    handleRemovePrecinctPatch,
    handleRemoveStreet,
    handleShrinkPrecinctToMin,
  } = useStadiumActions({
    stadium,
    finances,
    academyFacility,
    season,
    week,
    youthCamps,
    academyProject: session.academyProject,
    patchSession,
    requestClubSpend,
    flashNotice,
  });

  const {
    handleNext,
    handleNextRef,
    handleFastForwardToMonth,
    finishWeekSimulation,
  } = useWeekAdvance({
    save,
    session,
    youthInbox,
    players,
    screen,
    simulating,
    setSimulating,
    setScreen,
    setTrainingAutoNext,
    trainingAutoNext,
    patchSession,
    replaceSave,
    setSave,
    flashNotice,
    openPostfach,
    setPostfachItemId,
    setProfileId,
    setForeignPlayerId,
    setProfileFeedback,
    careerMatchSetup,
    careerMatchUiVisible,
    careerMatchFlowRef,
    setCareerMatchSetup,
    setCareerMatchUiVisible,
    pendingWatchedMatch,
    setPendingWatchedMatch,
    revealCampDebut: setCampDebutReveal,
  });

  const completeCareerMatch = useCallback(
    async (outcome: WatchedPlayerMatch, skipPlayback = false) => {
      if (simulating) return;
      setPendingWatchedMatch(outcome);
      if (skipPlayback) {
        setSimulating(true);
        try {
          patchSession((current) => ({
            ...current,
            weekday: 7,
            matchPlayedThisWeek: true,
          }));
          careerMatchFlowRef.current = false;
          setCareerMatchSetup(null);
          setCareerMatchUiVisible(true);
          await finishWeekSimulation(outcome);
        } catch (error) {
          console.error("Week simulation failed", error);
          flashNotice(t("shell.weekSimFailed"), "warn");
        } finally {
          setSimulating(false);
        }
        return;
      }
      patchSession((current) => ({
        ...current,
        weekday: 7,
        matchPlayedThisWeek: true,
      }));
      careerMatchFlowRef.current = false;
      setCareerMatchSetup(null);
      setCareerMatchUiVisible(true);
    },
    [finishWeekSimulation, flashNotice, patchSession, simulating],
  );
  const handleCareerMatchComplete = useCallback(
    (outcome: WatchedPlayerMatch) => void completeCareerMatch(outcome, false),
    [completeCareerMatch],
  );
  const handleCareerMatchSkip = useCallback(
    (outcome: WatchedPlayerMatch) => void completeCareerMatch(outcome, true),
    [completeCareerMatch],
  );

  useEffect(() => {
    if (screen !== "training") {
      setTrainingAutoNext(false);
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== "medical") return;
    const stamp = session.medicalState.physio_auto_week;
    if (stamp?.season === season && stamp?.week === week) return;
    patchSession((current) => {
      const level = precinctMedicalCenterLevel(current.stadium.precinct);
      const medicalState = ensurePhysioWeek(
        current.medicalState,
        current.players,
        current.season,
        current.week,
        level,
      );
      if (medicalState === current.medicalState) return current;
      return { ...current, medicalState };
    });
  }, [
    patchSession,
    screen,
    season,
    week,
    session.medicalState.physio_auto_week?.season,
    session.medicalState.physio_auto_week?.week,
  ]);

  useEffect(() => {
    if (!trainingAutoNext || simulating) return;
    const timer = window.setInterval(() => {
      handleNextRef.current({ fromAuto: true });
    }, TRAINING_AUTO_NEXT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [trainingAutoNext, simulating]);

  const handleInboxDecision = useCallback(
    (itemId: string, action: DecisionAction) => {
      let openContractTalkPlayerId: string | null = null;
      patchSession((current) => {
        const item = current.youthInbox.items.find((entry) => entry.id === itemId);
        const player = item?.playerId
          ? current.players.find((entry) => entry.id === item.playerId)
          : null;
        const result = applyInboxDecision(
          current.youthInbox,
          current.players,
          itemId,
          action,
          current.season,
          current.week,
        );
        if (pendingInboxItems(result.inbox, result.players).length === 0) {
          setPostfachItemId(null);
        }
        let next = {
          ...current,
          players: result.players,
          youthInbox: result.inbox,
        };
        if (item?.kind === "assistant_training_reminder") {
          next = {
            ...next,
            trainingReminderWeek: { season: current.season, week: current.week },
          };
        }
        if (item?.kind === "kicker_transfer") {
          const edition =
            next.kickerEdition ??
            current.kickerEdition ??
            null;
          next = {
            ...next,
            kickerConsumedWeek: { season: current.season, week: current.week },
            ...(edition
              ? {
                  kickerEditionArchive: archiveKickerEdition(next.kickerEditionArchive, edition),
                }
              : {}),
          };
        }
        if (item && isStoryInboxItem(item)) {
          const choiceId = storyChoiceId(action);
          if (choiceId && item.narrative && isFinancingStoryChannel(item.narrative.beatId)) {
            const applied = applyFinancingStoryChoice(item.narrative.beatId, choiceId, {
              finances: next.finances,
              financing: next.financing,
              stadium: next.stadium,
              board: next.board,
              players: next.players,
              season: current.season,
              week: current.week,
            });
            next = {
              ...next,
              finances: applied.finances,
              financing: applied.financing,
              stadium: applied.stadium ?? next.stadium,
              board: applied.board ?? next.board,
              players: applied.players ?? next.players,
            };
          } else if (choiceId && item.narrative && isCompanionPickBeat(item.narrative.beatId)) {
            next = applyCompanionPick(next, choiceId);
          } else if (choiceId) {
            next = resolveStoryInboxDecision(next, item, choiceId);
          }
          const localized = item.narrative
            ? localizeStoryInbox(item.narrative, current.storyState.cast)
            : null;
          const title = localized?.title ?? "Story";
          const message = `${title}: ${actionLabel(action, { item, cast: current.storyState.cast })}`;
          return sessionWithEvent(next, "inbox", message);
        }
        if (result.transferRecord) {
          next = {
            ...next,
            transferState: appendTransferRecord(current.transferState, result.transferRecord),
          };
        }
        if (result.loanFee && result.loanFee > 0) {
          next = {
            ...next,
            finances: {
              ...next.finances,
              cash: next.finances.cash + result.loanFee,
            },
          };
        }
        // Mail without a player (Der Treter, training reminder): reading it is not a deferred decision.
        if (action === "dismiss" && !player) return next;
        const playerName = player ? formatPlayerName(player) : "Spieler";
        const message =
          action === "loan" && result.transferRecord
            ? loanOutMessage(result.transferRecord)
            : action === "dismiss"
              ? t("inbox.event.deferredDecision", { player: playerName })
              : t("inbox.event.actionWithPlayer", {
                  action: actionLabel(action),
                  player: playerName,
                });
        const kind = action === "loan" ? "transfer" : "inbox";
        if (item && inboxActionOpensContractTalk(action, item)) {
          openContractTalkPlayerId = item.playerId;
        }
        return sessionWithEvent(next, kind, message);
      });
      if (openContractTalkPlayerId) {
        setProfileId(openContractTalkPlayerId);
        setProfileOpenContractTalk(true);
        setProfileFeedback(null);
      }
    },
    [patchSession],
  );

  const handleOpeningComplete = useCallback(
    (origin: CareerOrigin, captainPlayerId: string, managerName: string) => {
      patchSession((current) => completeOpening(current, origin, captainPlayerId, managerName));
    },
    [patchSession],
  );

  const handleAcceptJobOffer = useCallback(
    (clubId: TeamId) => {
      patchSession((current) => acceptJobOffer(current, clubId));
    },
    [patchSession],
  );

  const handleAcceptStoryOffer = useCallback(
    (teamId: TeamId) => {
      patchSession((current) => acceptStoryEmployerOffer(current, teamId));
    },
    [patchSession],
  );

  const handleSaveTacticsPreset = useCallback(
    (id: TacticsPresetId, plan: SandboxPlan) => {
      patchSession((current) => ({
        ...current,
        tacticsPresets: saveTacticsPreset(current.tacticsPresets, id, plan),
      }));
    },
    [patchSession],
  );

  const handleSaveMatchLineup = useCallback(
    (lineup: MatchLineupState) => {
      patchSession((current) => ({ ...current, matchLineup: lineup }));
    },
    [patchSession],
  );

  const handleRecallLoan = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;
        const recalled = recallLoanPlayer(player, current.season, current.week);
        if (!recalled) return current;
        return sessionWithEvent(
          {
            ...current,
            players: current.players.map((entry) =>
              entry.id === playerId ? recalled.player : entry,
            ),
            transferState: appendTransferRecord(current.transferState, recalled.record),
          },
          "transfer",
          loanReturnMessage(recalled.record),
        );
      });
    },
    [patchSession],
  );

  const handleToggleShortlist = useCallback(
    (playerId: string) => {
      patchSession((current) => ({
        ...current,
        transferState: toggleShortlist(current.transferState, playerId),
      }));
    },
    [patchSession],
  );

  const handleToggleProfileListing = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player || player.club_id !== current.clubId) return current;
        if (scheduledTransferReason(current.transferState, playerId, current.season)) return current;
        const transferStateNext = isPlayerListed(current.transferState, playerId)
          ? unlistPlayer(current.transferState, playerId)
          : listPlayerForSale(current.transferState, player, current.season, current.week);
        return { ...current, transferState: transferStateNext };
      });
    },
    [patchSession],
  );

  const handlePreContract = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const target = getBoardTarget(current.scoutBoard, playerId, current.rivalPlayers);
        if (!target) return current;

        const pending = current.transferState.pending_transfers ?? [];
        const eligibility = canSignPreContract(
          target.player,
          current.clubId,
          current.season,
          current.week,
          pending,
        );
        if (!eligibility.allowed) {
          return sessionWithEvent(
            current,
            "transfer",
            eligibility.reason ?? t("clubEvent.preContractNotAllowed"),
          );
        }

        const offer = preContractOffer(target.player, current.season, current.week);
        if (!offer || !canAffordTransfer(current.finances, offer.signingBonus)) {
          return sessionWithEvent(
            current,
            "finance",
            t("clubEvent.preContractBudget", {
              amount: formatClubCash(offer?.signingBonus ?? 0),
            }),
          );
        }

        const leagueClubIds = current.league.club_ids.map((teamId) => careerTeamId(teamId));
        const deal = attemptPreContract(
          current.transferState,
          target.player,
          current.clubId,
          current.season,
          current.week,
          current.masterSeed,
          leagueClubIds,
        );
        if (!deal.won || !deal.pending) {
          return sessionWithEvent(
            { ...current, transferState: deal.state },
            "transfer",
            deal.winnerClubId
              ? t("clubEvent.preContractLost", {
                  player: formatPlayerName(target.player),
                  club: loanClubName(deal.winnerClubId),
                })
              : t("clubEvent.preContractFailed"),
          );
        }

        return sessionWithEvent(
          {
            ...current,
            transferState: deal.state,
            finances: applyTransferFee(current.finances, deal.pending.signing_bonus, current.week),
          },
          "transfer",
          t("clubEvent.preContractSigned", {
            player: formatPlayerName(target.player),
            season: formatSeasonLabel(deal.pending.effective_season),
          }),
        );
      });
      setForeignPlayerId(null);
    },
    [patchSession],
  );

  const handleProfileAction = useCallback(
    (playerId: string, action: PlayerProfileAction) => {
      patchSession((current) => {
        const lock = scheduledTransferReason(current.transferState, playerId, current.season);
        if (lock) {
          setProfileFeedback(lock);
          return current;
        }
        const { players: nextPlayers, result } = applyProfileActionToSquad(
          current.players,
          playerId,
          action,
          current.clubId,
          current.season,
          current.week,
          current.weekday,
        );
        if (!result) return current;
        const next = sessionWithEvent(
          { ...current, players: nextPlayers },
          "profile",
          result.message,
        );
        if (result.removed) {
          setProfileId(null);
          setProfileFeedback(null);
        } else {
          setProfileFeedback(result.message);
          if (result.openContractTalk) {
            setProfileId(playerId);
            setProfileOpenContractTalk(true);
          }
        }
        return next;
      });
    },
    [patchSession],
  );

  const handleTerminateContract = useCallback(
    (playerId: string) => {
      const player = players.find((entry) => entry.id === playerId);
      if (!player) return;
      const blocked = canReleasePlayer(player, players, session.clubId);
      if (blocked) {
        setProfileFeedback(blocked);
        return;
      }
      const cost = contractTerminationPayout(player, season, week);
      requestClubSpend(
        cost,
        `Vertrag auflösen · ${formatPlayerName(player)}`,
        (current) => {
          const subject = current.players.find((entry) => entry.id === playerId);
          if (!subject) return current;
          const stillBlocked = canReleasePlayer(subject, current.players, current.clubId);
          if (stillBlocked) return current;
          const payout = contractTerminationPayout(subject, current.season, current.week);
          if (payout > current.finances.cash) return current;
          const { players: nextPlayers, result } = applyProfileActionToSquad(
            current.players,
            playerId,
            "release",
            current.clubId,
            current.season,
            current.week,
            current.weekday,
          );
          if (!result?.removed) return current;
          const next = sessionWithEvent(
            {
              ...current,
              players: nextPlayers,
              finances: spendClubCash(current.finances, payout, current.week),
            },
            "profile",
            result.message,
          );
          setProfileId(null);
          setProfileFeedback(null);
          return next;
        },
      );
    },
    [players, requestClubSpend, season, session.clubId, week],
  );

  const handleContractOffer = useCallback(
    (playerId: string, offer: ContractOffer) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;
        const lock = scheduledTransferReason(current.transferState, playerId, current.season);
        if (lock) {
          setProfileFeedback(lock);
          return current;
        }
        const headroom = wageBudgetHeadroom(current.finances, current.players, current.clubId);
        const currentWage = player.contract?.wage_weekly ?? 0;
        if (!wageDeltaFitsBudget(headroom, currentWage, offer.wageWeekly)) {
          setProfileFeedback(
            `Gehalts-Cap: nur noch ${formatClubCash(Math.max(0, headroom))}/Woche frei.`,
          );
          return current;
        }
        const result = submitContractOffer(player, current.season, offer, {
          season: current.season,
          week: current.week,
          weekday: current.weekday,
        });
        let signed = result.player;
        if (result.accepted && player.squad_status === "u19") {
          signed = grantAchievement(
            {
              ...signed,
              squad_status: "pro",
              state: {
                ...signed.state,
                pro_trial: undefined,
                modifiers: signed.state.modifiers.filter(
                  (mod) => !mod.source_event_id.startsWith("pro_trial_"),
                ),
              },
            },
            ACHIEVEMENT.promotedPro,
          );
        }
        const nextPlayers = current.players.map((entry) =>
          entry.id === playerId ? signed : entry,
        );
        setProfileFeedback(result.message);
        return sessionWithEvent(
          { ...current, players: nextPlayers },
          "profile",
          result.message,
        );
      });
    },
    [patchSession],
  );

  const jobOffers = listJobOffers(board.employer_club_id, season, league);
  const storyTransition = isCareerTransitionPending(storyState) ? storyState.act_transition : null;
  const storyOffers = storyTransition
    ? storyTransition.offer_team_ids.map((teamId) => jobOfferForTeam(teamId, season, league))
    : [];
  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const openDecisionCount = postfachOpenCount(
    youthInbox,
    players,
    youthCamps,
    scoutBoard,
    orthopedistHire,
    Boolean(medicalStaff.orthopedist),
  );

  const hubNextBlockerCount = useMemo(
    () => hubBlockerCount({ session, youthInbox, players }),
    [session, youthInbox, players],
  );

  const managerDeskHubScreen =
    MANAGER_DESK_HUB_ENABLED && screen === "hub" && !(careerMatchSetup && careerMatchUiVisible);

  const hubHeaderNextCopy = useMemo((): { title: string } | null => {
    if (!managerDeskHubScreen) return null;
    if (hasInboxBlockerForNext(session, youthInbox, players)) {
      return { title: t("shell.nextToPostfach") };
    }
    if (trainingAutoNext) {
      return { title: t("hub.desk.next.pauseTitle") };
    }
    if (isTrainingCalendarGatePending(session)) {
      return { title: t("training.next.mondayCalendar") };
    }
    if (isTrainingNextActive(session)) {
      return {
        title:
          hubNextBlockerCount > 0
            ? t("hub.desk.next.blockersTitle", { count: String(hubNextBlockerCount) })
            : t("hub.desk.next.runWeekTitle"),
      };
    }
    return { title: t("shell.smartSkip") };
  }, [
    careerMatchSetup,
    careerMatchUiVisible,
    hubNextBlockerCount,
    managerDeskHubScreen,
    players,
    session,
    trainingAutoNext,
    youthInbox,
    locale,
  ]);

  const closePlayerProfile = useCallback(() => {
    setProfileId(null);
    setProfileFeedback(null);
  }, []);

  const closeForeignProfile = useCallback(() => {
    setForeignPlayerId(null);
  }, []);

  const shellHeaderBack = useMemo((): {
    title: string;
    onBack: () => void;
    iconOnly?: boolean;
  } | null => {
    if (profilePlayer) {
      return { title: formatPlayerName(profilePlayer), onBack: closePlayerProfile };
    }
    if (foreignProfileTarget) {
      return { title: formatPlayerName(foreignProfileTarget.player), onBack: closeForeignProfile };
    }
    if (screen === "scouting" && scoutMapDetailNav) {
      return { title: scoutMapDetailNav.title, onBack: scoutMapDetailNav.onBack };
    }
    const hubDrilldownTitle: Partial<Record<Screen, string>> = {
      postfach: t("shell.nav.postfach"),
      "club-events": t("hub.events.screenTitle"),
      training: t("shell.nav.training"),
      squad: t("shell.nav.squad"),
      medical: t("shell.nav.medical"),
    };
    const drillTitle = hubDrilldownTitle[screen];
    if (drillTitle) {
      return { title: drillTitle, onBack: () => setScreen("hub") };
    }
    return null;
  }, [
    closeForeignProfile,
    closePlayerProfile,
    foreignProfileTarget,
    profilePlayer,
    scoutMapDetailNav,
    screen,
    locale,
  ]);

  careerMatchFlowRef.current = careerMatchSetup != null;
  matchNavActionRef.current = matchNavAction;

  const matchFlowBrowsing = Boolean(careerMatchSetup && !careerMatchUiVisible);

  const offHubDeskNext =
    MANAGER_DESK_HUB_ENABLED &&
    !managerDeskHubScreen &&
    !matchFlowBrowsing &&
    !(careerMatchSetup && careerMatchUiVisible);

  const returnToCareerLineup = useCallback(() => {
    setCareerMatchUiVisible(true);
    setScreen("hub");
  }, []);

  const handleAppNavigate = useCallback(
    (next: Screen) => {
      if (
        careerMatchSetup &&
        careerMatchUiVisible &&
        next !== "hub" &&
        careerMatchInLineupRef.current
      ) {
        setCareerMatchUiVisible(false);
      }
      const navTarget = next as CurtainNavScreen;
      if (!isNavScreenVisible(navTarget, storyState)) {
        setScreen("hub");
        return;
      }
      setScreen(next);
    },
    [careerMatchSetup, careerMatchUiVisible, storyState],
  );

  useEffect(() => {
    const visible = isNavScreenVisible(screen as CurtainNavScreen, storyState);
    if (!visible) {
      setScreen("hub");
    }
  }, [screen, storyState]);

  const handleHeaderPrimaryClick = useCallback(() => {
    if (matchFlowBrowsing) {
      returnToCareerLineup();
      return;
    }
    const action = matchNavActionRef.current;
    const inMatchFlow = careerMatchFlowRef.current && careerMatchUiVisible;
    if (action?.onClick && !action.disabled) {
      action.onClick();
      return;
    }
    if (inMatchFlow) {
      return;
    }
    handleNext();
  }, [careerMatchUiVisible, handleNext, matchFlowBrowsing, returnToCareerLineup]);

  const backToLineupAction = useMemo<NavPrimaryAction>(
    () => ({
      label: t("match.lineup.backToSelection"),
      onClick: returnToCareerLineup,
      title: t("match.lineup.backToSelectionTitle"),
    }),
    [returnToCareerLineup, locale],
  );

  const nextHeaderTitle = matchFlowBrowsing
    ? t("match.lineup.backToSelection")
    : offHubDeskNext
      ? t("shell.next")
      : hubHeaderNextCopy
        ? hubHeaderNextCopy.title
        : careerMatchSetup
          ? t("shell.next")
          : hasInboxBlockerForNext(session, youthInbox, players)
            ? t("shell.nextToPostfach")
            : isTrainingCalendarGatePending(session)
              ? screen === "calendar"
                ? t("training.next.startTraining")
                : t("training.next.mondayCalendar")
              : isTrainingNextActive(session)
                ? t("training.next.header", {
                    remaining: String(trainingWeekSlotsRemaining(session)),
                  })
                : shouldNavigateToCalendarBeforeTimeStep(
                      screen,
                      hasInboxBlockerForNext(session, youthInbox, players),
                      session,
                    )
                  ? t("shell.nextViaCalendar")
                  : t("shell.smartSkip");

  const nextHeaderButtonLabel =
    matchFlowBrowsing
      ? t("match.lineup.backToSelection")
      : careerMatchSetup && careerMatchUiVisible && matchNavAction?.label
        ? matchNavAction.label
        : t("shell.next");

  const nextHeaderButtonTitle =
    hubHeaderNextCopy && trainingAutoNext
      ? t("training.autoNext.active")
      : trainingAutoNext &&
          screen === "training" &&
          !(careerMatchSetup && careerMatchUiVisible)
        ? t("training.autoNext.active")
        : undefined;

  const nextHeaderBadgeCount = managerDeskHubScreen ? hubNextBlockerCount : openDecisionCount;
  const nextHeaderBadgeAria = managerDeskHubScreen
    ? t("hub.desk.next.blockerBadge")
    : t("hub.inbox.decisions");

  const navActions: HubNavActions = {
    week,
    weekday,
    simulating,
    openDecisionCount,
    nextHeaderBadgeCount,
    nextHeaderBadgeAria,
    onNext: () => void handleNext(undefined),
    onHeaderPrimaryClick: handleHeaderPrimaryClick,
    onNewGame: resetGame,
    onOpenSaves: () => setScreen("settings"),
    matchFlowActive: Boolean(careerMatchSetup && careerMatchUiVisible),
    primaryAction: matchFlowBrowsing
      ? backToLineupAction
      : careerMatchSetup && careerMatchUiVisible
        ? matchNavAction
        : null,
    matchSkipToReport: careerMatchSetup ? matchSkipToReport : null,
    nextHeaderTitle,
    nextHeaderButtonLabel,
    nextHeaderButtonTitle,
  };

  const constructionSnapshot = useMemo(
    () =>
      constructionSnapshotFromSession({
        stadium,
        youthCamps,
        academyProject: session.academyProject,
        season,
        week,
      }),
    [stadium, youthCamps, session.academyProject, season, week],
  );

  const spendConfirmOverlay = pendingSpend ? (
    <SpendConfirmSheet
      title={pendingSpend.title}
      earlySeasonHint={pendingSpend.earlySeasonHint}
      constructionSnapshot={pendingSpend.construction ? constructionSnapshot : null}
      runway={spendRunway(
        finances,
        weeklyWageBill(players, session.clubId),
        pendingSpend.cost,
        boardCashFloor(board),
      )}
      onConfirm={() => {
        const apply = pendingSpend.apply;
        patchSession((current) => {
          const beforeCash = current.finances.cash;
          const beforeBlocks = JSON.stringify(current.stadium.block_expansion ?? {});
          const next = apply(current);
          const changed =
            next.finances.cash !== beforeCash ||
            JSON.stringify(next.stadium.block_expansion ?? {}) !== beforeBlocks ||
            next.stadium.precinct !== current.stadium.precinct ||
            next.academyFacility !== current.academyFacility;
          if (!changed) {
            flashNotice(t("shell.spendFailed"), "warn");
          }
          return next;
        });
        setPendingSpend(null);
      }}
      onCancel={() => setPendingSpend(null)}
    />
  ) : null;

  const noticeOverlay = <NoticeToast message={notice?.text ?? null} tone={notice?.tone ?? "ok"} />;

  const campDebutPlayer =
    campDebutReveal != null
      ? players.find((entry) => entry.id === campDebutReveal.playerId)
      : undefined;

  useEffect(() => {
    if (campDebutReveal && !campDebutPlayer) {
      setCampDebutReveal(null);
    }
  }, [campDebutPlayer, campDebutReveal]);
  const campDebutOverlay =
    campDebutReveal && campDebutPlayer ? (
      <CampOpeningDebutModal
        campId={campDebutReveal.campId}
        player={campDebutPlayer}
        onClose={() => setCampDebutReveal(null)}
        onViewPlayer={() => {
          setProfileId(campDebutPlayer.id);
          setCampDebutReveal(null);
          setScreen("campus");
        }}
      />
    ) : null;

  const careerBroadcastStory = useMemo(
    () =>
      careerMatchSetup
        ? buildBroadcastStoryContext(session, careerMatchSetup, rivalPlayers)
        : undefined,
    [careerMatchSetup, rivalPlayers, session.league, session.storyState, session.masterSeed, session.season],
  );

  const matchFanbaseMood = fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE);
  const matchPoorForm = teamPoorRecentForm(teamForm(league, board.employer_club_id, 3));
  const stadiumWeekFixture = playerFixture(league, league.matchday);
  const stadiumIsHomeMatchWeek = stadiumWeekFixture?.homeTeamId === session.clubId;
  const stadiumOpponentFanbase =
    stadiumIsHomeMatchWeek && stadiumWeekFixture
      ? clubFlavorFanbase(stadiumWeekFixture.awayTeamId)
      : DEFAULT_FANBASE;

  const browserDocumentTitle = useMemo(() => {
    const product = t("shell.productName");
    if (careerMatchSetup) {
      const fixtureLabel = careerMatchSetup.isHome
        ? `${shellClub.name} – ${careerMatchSetup.opponentShortName}`
        : `${careerMatchSetup.opponentShortName} – ${shellClub.name}`;
      return joinDocumentTitle(t("shell.documentTitle.live"), fixtureLabel, product);
    }
    if (profilePlayer) {
      return joinDocumentTitle(formatPlayerName(profilePlayer), shellClub.name, product);
    }
    if (foreignProfileTarget) {
      return joinDocumentTitle(formatPlayerName(foreignProfileTarget.player), t("shell.nav.scouting"), product);
    }
    if (screen === "hub") {
      return joinDocumentTitle(shellClub.name, formatSeasonLabel(season), product);
    }
    return joinDocumentTitle(t(SCREEN_DOCUMENT_TITLE_KEYS[screen]), shellClub.name, product);
  }, [
    careerMatchSetup,
    foreignProfileTarget,
    profilePlayer,
    screen,
    season,
    shellClub.name,
    locale,
  ]);

  useDocumentTitle(browserDocumentTitle);

  if (careerMatchSetup && careerMatchUiVisible) {
    return (
      <CareerMatchLiveShell
        setup={careerMatchSetup}
        session={session}
        players={players}
        rivalPlayers={rivalPlayers}
        shellClub={shellClub}
        navActions={navActions}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        onNavigate={handleAppNavigate}
        medicalAttentionCount={medicalAttentionCount}
        simulating={simulating}
        onSaveTacticsPreset={handleSaveTacticsPreset}
        onSaveMatchLineup={handleSaveMatchLineup}
        onComplete={handleCareerMatchComplete}
        onSkip={handleCareerMatchSkip}
        onNavActionChange={setMatchNavAction}
        onSelectMatchPlayer={(playerId) => {
          if (players.some((player) => player.id === playerId)) {
            setProfileId(playerId);
            setForeignPlayerId(null);
          } else {
            setForeignPlayerId(playerId);
            setProfileId(null);
          }
        }}
        onRegisterSkipToReport={registerMatchSkipToReport}
        broadcastStory={careerBroadcastStory}
        fanbaseMood={matchFanbaseMood}
        poorForm={matchPoorForm}
        onOpenOpponentScoutReport={handleOpenOpponentScoutReport}
        onLineupPhaseChange={(inLineup) => {
          careerMatchInLineupRef.current = inLineup;
        }}
        overlays={
          <>
            {spendConfirmOverlay}
            {noticeOverlay}
          </>
        }
      />
    );
  }

  if (foreignProfileTarget) {
    const foreignView = foreignProfileTarget;
    const purchaseCelebration = negotiationUiPhase === "won";
    return (
      <>
        <AppChrome
          screen={screen}
          week={week}
          weekday={weekday}
          trainingPlan={trainingPlan}
          storyState={storyState}
          stadium={stadium}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
          clubKit={shellClub.kit}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={handleAppNavigate}
          headerBack={shellHeaderBack}
          onCloseProfile={() => setForeignPlayerId(null)}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
          medicalAttentionCount={medicalAttentionCount}
          cash={finances.cash}
          boardCashFloor={boardCashFloor(board)}
          weeklyWageBill={weeklyWageBill(players, session.clubId)}
        />
        <PlayerProfile
          player={foreignView.player}
          owned={purchaseCelebration}
          scoutEstimate={foreignView.estimate}
          scouting={foreignView.assigned}
          week={week}
          season={season}
          transferWindowOpen={isTransferWindowOpen(week)}
          transferBudget={Math.max(0, transferBudget(finances) - committedTransferFees(transferState))}
          purchasePrice={
            isPlayerListed(transferState, foreignView.player.id)
              ? sellerAskingPrice(foreignView.player, season)
              : unsolicitedAskingPrice(sellerAskingPrice(foreignView.player, season))
          }
          purchaseUnsolicited={!isPlayerListed(transferState, foreignView.player.id)}
          shortlisted={transferState.shortlist.includes(foreignView.player.id)}
          onAssignScout={() => handleAssignScout(foreignView.player.id)}
          onToggleShortlist={() => handleToggleShortlist(foreignView.player.id)}
          onPurchase={
            purchaseCelebration ? undefined : () => handleOpenNegotiation(foreignView.player.id)
          }
          purchaseBlockedReason={
            scheduledTransferReason(transferState, foreignView.player.id, season) ??
            (isPlayerListed(transferState, foreignView.player.id)
              ? null
              : unsolicitedRefusalReason(foreignView.player, rivalPlayers))
          }
          actionFeedback={profileFeedback}
          onTransferNotice={(message) => {
            setProfileFeedback(message);
            flashNotice(message);
          }}
          preContractBonus={preContractOffer(foreignView.player, season, week)?.signingBonus}
          preContractBlockedReason={(() => {
            const lock = scheduledTransferReason(transferState, foreignView.player.id, season);
            if (lock) return lock;
            const eligibility = canSignPreContract(
              foreignView.player,
              session.clubId,
              season,
              week,
              transferState.pending_transfers ?? [],
            );
            if (!eligibility.allowed) return eligibility.reason ?? null;
            const offer = preContractOffer(foreignView.player, season, week);
            if (!offer) return t("profile.preContract.noContract");
            if (!canAffordTransfer(finances, offer.signingBonus)) {
              return t("profile.preContract.bonusOverBudget", { amount: formatClubCash(offer.signingBonus) });
            }
            return null;
          })()}
          onPreContract={() => handlePreContract(foreignView.player.id)}
        />
        {negotiationOverlay}
        {spendConfirmOverlay}
        {noticeOverlay}
      </>
    );
  }

  if (profilePlayer) {
    return (
      <>
        <AppChrome
          screen={screen}
          week={week}
          weekday={weekday}
          trainingPlan={trainingPlan}
          storyState={storyState}
          stadium={stadium}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
          clubKit={shellClub.kit}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={handleAppNavigate}
          headerBack={shellHeaderBack}
          onCloseProfile={() => {
            setProfileId(null);
            setProfileOpenContractTalk(false);
          }}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
          medicalAttentionCount={medicalAttentionCount}
          cash={finances.cash}
          boardCashFloor={boardCashFloor(board)}
          weeklyWageBill={weeklyWageBill(players, session.clubId)}
        />
        <PlayerProfile
          player={profilePlayer}
          owned
          week={week}
          season={season}
          weekday={weekday}
          openContractTalkOnMount={profileOpenContractTalk}
          onContractTalkOpened={() => setProfileOpenContractTalk(false)}
          transferWindowOpen={isTransferWindowOpen(week)}
          saleOffer={estimateSaleOffer(profilePlayer, season)}
          saleBlockedReason={(() => {
            const eligibility = canSellPlayer(profilePlayer, players, session.clubId, week);
            return eligibility.allowed ? null : eligibility.reason ?? null;
          })()}
          transferLockReason={scheduledTransferReason(transferState, profilePlayer.id, season)}
          individualPrograms={individualPrograms}
          trainingPlan={trainingPlan}
          actionFeedback={profileFeedback}
          onTransferNotice={(message) => {
            setProfileFeedback(message);
            flashNotice(message);
          }}
          onList={() => handleToggleProfileListing(profilePlayer.id)}
          listedForSale={isPlayerListed(transferState, profilePlayer.id)}
          onProfileAction={(action) => handleProfileAction(profilePlayer.id, action)}
          onTerminateContract={() => handleTerminateContract(profilePlayer.id)}
          onContractOffer={(offer) => handleContractOffer(profilePlayer.id, offer)}
          wageHeadroomWeekly={wageBudgetHeadroom(finances, players, session.clubId)}
          onOpenTraining={() => {
            setTrainingFocusPlayerId(profilePlayer.id);
            setProfileId(null);
            setProfileFeedback(null);
            setScreen("training");
          }}
          onStartStampProgram={(stampId) => handleStartStampProgram(profilePlayer.id, stampId)}
          onOpenYouth={
            profilePlayer.squad_status === "u17" || profilePlayer.squad_status === "u19"
              ? () => {
                  setProfileId(null);
                  setScreen("campus");
                }
              : undefined
          }
        />
        {negotiationOverlay}
        {spendConfirmOverlay}
        {noticeOverlay}
      </>
    );
  }

  if (!sessionReady) {
    return (
      <div className="app-boot" role="status">
        <p>{t("shell.booting")}</p>
      </div>
    );
  }

  return (
    <>
      <AppChrome
        screen={screen}
        week={week}
        weekday={weekday}
        trainingPlan={trainingPlan}
        storyState={storyState}
        stadium={stadium}
        clubName={shellClub.name}
        clubInitials={shellClub.initials}
        clubLogoSrc={shellClub.logoSrc}
        clubKit={shellClub.kit}
        leaguePlace={shellClub.leaguePlace}
        onNavigate={handleAppNavigate}
        headerBack={shellHeaderBack}
        onCampusNavigate={() => undefined}
        hubActions={navActions}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        shellChrome="card"
        medicalAttentionCount={medicalAttentionCount}
        cash={finances.cash}
        boardCashFloor={boardCashFloor(board)}
        weeklyWageBill={weeklyWageBill(players, session.clubId)}
      />
      <GameSessionProvider value={{ session, patchSession, flashNotice }}>
        <PortraitKitProvider worldClubs={world.clubs}>
        <TutorialUiProvider
          coachMarksEnabled={accessibility.coachMarksEnabled}
          matchFlowActive={Boolean(navActions.matchFlowActive)}
        >
          <TutorialCoachLayer
            screen={screen}
            coachMarksEnabled={accessibility.coachMarksEnabled}
            matchFlowActive={Boolean(navActions.matchFlowActive)}
            onDisableCoachMarksGlobally={() =>
              setAccessibility({ ...accessibility, coachMarksEnabled: false })
            }
          />
          <GameScreenRouter
              screen={screen}
              save={save}
              players={players}
              season={season}
              week={week}
              weekday={weekday}
              trainingPlan={trainingPlan}
              trainingPlanPresets={trainingPlanPresets}
              trainingIntensity={trainingIntensity}
              individualPrograms={individualPrograms}
              league={league}
              finances={finances}
              board={board}
              youthInbox={youthInbox}
              scoutBoard={scoutBoard}
              clubEvents={clubEvents}
              storyState={storyState}
              youthCamps={youthCamps}
              transferState={transferState}
              lastSeasonAwards={lastSeasonAwards}
              coachingStaff={coachingStaff}
              assistantDelegation={assistantDelegation}
              masterSeed={masterSeed}
              rivalPlayers={rivalPlayers}
              world={world}
              scoutNetwork={scoutNetwork}
              academyFacility={academyFacility}
              stadium={stadium}
              medicalStaff={medicalStaff}
              medicalState={medicalState}
              orthopedistHire={orthopedistHire}
              injuryRiskFactor={injuryRiskFactor}
              trainingUnitsCompleted={trainingUnitsCompleted}
              trainingUnitOutcomes={trainingUnitOutcomes}
              financing={financing}
              marketFilters={marketFilters}
              marketSort={marketSort}
              postfachItemId={postfachItemId}
              trainingFocusPlayerId={trainingFocusPlayerId}
              trainingAutoNext={trainingAutoNext}
              campLeaderDismissCampId={campLeaderDismissCampId}
              campusTab={campusTab}
              campusYouthSort={campusYouthSort}
              campusInitialTab={campusInitialTab}
              scoutingInitialTab={scoutingInitialTab}
              clubProfileId={clubProfileId}
              calendarMilestones={calendarMilestones}
              stadiumIsHomeMatchWeek={stadiumIsHomeMatchWeek}
              stadiumOpponentFanbase={stadiumOpponentFanbase}
              playerDivisionId={playerDivisionId}
              scoutCapacity={scoutCapacity}
              simulating={simulating}
              jobOffers={jobOffers}
              accessibility={accessibility}
              activeSlot={activeSlot}
              loadSaveSlot={loadSaveSlot}
              applyImportedSave={applyImportedSave}
              newGameInSlot={newGameInSlot}
              applyCloudSave={applyCloudSave}
              openMarketNegotiation={handleOpenNegotiation}
              setScreen={setScreen}
              setScoutingInitialTab={setScoutingInitialTab}
              setCampusInitialTab={setCampusInitialTab}
              setCampusTab={setCampusTab}
              setCampusYouthSort={setCampusYouthSort}
              setTrainingFocusPlayerId={setTrainingFocusPlayerId}
              setTrainingAutoNext={setTrainingAutoNext}
              setCampLeaderDismissCampId={setCampLeaderDismissCampId}
              setClubProfileId={setClubProfileId}
              setProfileId={setProfileId}
              setForeignPlayerId={setForeignPlayerId}
              setMarketFilters={setMarketFilters}
              setMarketSort={setMarketSort}
              setAccessibility={setAccessibility}
              openPostfach={openPostfach}
              handleInboxDecision={handleInboxDecision}
              handleOpeningComplete={handleOpeningComplete}
              handleDismissScoutJob={handleDismissScoutJob}
              handleApplyOpponentScoutPlan={handleApplyOpponentScoutPlan}
              handleConfirmDismissCampLeader={handleConfirmDismissCampLeader}
              handleBuyYouthCamp={handleBuyYouthCamp}
              handleCommissionCampLeader={handleCommissionCampLeader}
              handleRequestDismissCampLeader={handleRequestDismissCampLeader}
              handlePullCampPlayer={handlePullCampPlayer}
              handleTrainingPlanChange={handleTrainingPlanChange}
              handleTrainingIntensityChange={handleTrainingIntensityChange}
              handleIndividualProgramsChange={handleIndividualProgramsChange}
              handleTrainingPlanPresetsChange={handleTrainingPlanPresetsChange}
              handleAssistantDelegationChange={handleAssistantDelegationChange}
              handleHireCoach={handleHireCoach}
              handleAssignMentor={handleAssignMentor}
              handleClearMentor={handleClearMentor}
              handleHireCampLeader={handleHireCampLeader}
              handleHireOrthopedist={handleHireOrthopedist}
              handleEnqueueScoutTrip={handleEnqueueScoutTrip}
              handleScoutRegion={handleScoutRegion}
              handleAddScoutAssignment={handleAddScoutAssignment}
              handleCancelScoutWork={handleCancelScoutWork}
              handleToggleScoutAssignment={handleToggleScoutAssignment}
              handleAssignScout={handleAssignScout}
              handleHireScout={handleHireScout}
              handleFireScout={handleFireScout}
              handleToggleShortlist={handleToggleShortlist}
              handleScoutMapDetailChange={handleScoutMapDetailChange}
              handleRecallLoan={handleRecallLoan}
              handleHireMedicalDoctor={handleHireMedicalDoctor}
              handleHireMedicalPhysio={handleHireMedicalPhysio}
              handleRehabMinigameComplete={handleRehabMinigameComplete}
              handleDoctorExamComplete={handleDoctorExamComplete}
              handleSurgery={handleSurgery}
              handlePhysioManual={handlePhysioManual}
              handleMerchandisingChange={handleMerchandisingChange}
              handleMerchBulkPurchase={handleMerchBulkPurchase}
              handleMerchOnDemand={handleMerchOnDemand}
              handleMerchSaleStart={handleMerchSaleStart}
              handleCommissionMerchExpert={handleCommissionMerchExpert}
              handleHireMerchExpert={handleHireMerchExpert}
              handleDismissMerchExpert={handleDismissMerchExpert}
              handleDrawBankLoan={handleDrawBankLoan}
              handleStartBlockExpansion={handleStartBlockExpansion}
              handlePurchaseStadiumUpgrade={handlePurchaseStadiumUpgrade}
              handlePlacePrecinct={handlePlacePrecinct}
              handleUpgradePrecinct={handleUpgradePrecinct}
              handleBuyParcel={handleBuyParcel}
              handlePlaceStreet={handlePlaceStreet}
              handleExpandPrecinct={handleExpandPrecinct}
              handleShrinkPrecinctToMin={handleShrinkPrecinctToMin}
              handleRemovePrecinctPatch={handleRemovePrecinctPatch}
              handleRemoveStreet={handleRemoveStreet}
              handleUpgradeAcademy={handleUpgradeAcademy}
              handleStartOpponentScout={handleStartOpponentScout}
              handleOpenOpponentScoutReport={handleOpenOpponentScoutReport}
              handleFastForwardToMonth={handleFastForwardToMonth}
              handleAcceptJobOffer={handleAcceptJobOffer}
            />
        </TutorialUiProvider>
        </PortraitKitProvider>
      </GameSessionProvider>
      {board.job_status === "dismissed" ? (
        <JobOffersModal offers={jobOffers} onAccept={handleAcceptJobOffer} />
      ) : storyTransition ? (
        <StoryActTransitionModal
          transition={storyTransition}
          clubName={clubDisplayName(storyTransition.from_team_id, world.clubs)}
          offers={storyOffers}
          followerNames={storyFollowerNames(session)}
          onAccept={handleAcceptStoryOffer}
        />
      ) : null}
      {negotiationOverlay}
      {spendConfirmOverlay}
      {campDebutOverlay}
      {noticeOverlay}
      <SaveDirtyBanner
        visible={persistDirty}
        onExport={() => downloadSaveAsFile(save)}
      />
      <SaveToast visible={saveToastVisible} />
    </>
  );
}
