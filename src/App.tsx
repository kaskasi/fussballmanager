import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IndividualProgram } from "./development/individual-training.ts";
import { assignIndividualProgram } from "./development/individual-training.ts";
import { processTransferBreakout } from "./development/breakouts.ts";
import { needsTrainingPlanForToday } from "./development/training-plan-state.ts";
import {
  filterTeamNavScreens,
  isNavScreenVisible,
  resolveFeatureCurtain,
  suppressTrainingPlanWarning,
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
import { loadLocalSave, removeLocalSave, writeLocalSave } from "./persistence/local-save.ts";
import { getActiveSlot, setActiveSlot } from "./persistence/save-slots.ts";
import type { SaveGame } from "./persistence/savegame-model.ts";
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
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { ClubCrest } from "./ui/components/ClubCrest.tsx";
import { clubLogoUrlForPlayerClub } from "./ui/assets/club-logo.ts";
import { joinDocumentTitle, useDocumentTitle } from "./ui/document-title.ts";
import { prepareCareerMatch, type CareerMatchSetup } from "./sim/career-match-setup.ts";
import {
  buildOpponentScoutWorkingDayContext,
  startOpponentScoutJob,
} from "./scouting/opponent-scout-job.ts";
import type { WatchedPlayerMatch } from "./sim/watched-player-match.ts";
import { MONDAY, resolveSmartSkip } from "./sim/day-calendar.ts";
import {
  injectTrainingReminderInbox,
  shouldInjectTrainingReminderBeforeAdvance,
  trainingReminderItemId,
} from "./inbox/training-reminder-inbox.ts";
import {
  hasInboxBlockerForNext,
  shouldNavigateToCalendarBeforeTimeStep,
  shouldOpenLineupFromCalendar,
} from "./ui/nav-next-flow.ts";
import { formatSeasonLabel } from "./sim/season-label.ts";
import { simulateGameWeek } from "./sim/week-pipeline.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
  trainingWeekSlotsRemaining,
  usesTrainingNextNexus,
} from "./sim/training-next.ts";
import { attributeLabel } from "./ui/player-profile.ts";
import type { Attributes } from "./types/player.ts";
import { isTransferWindowOpen } from "./sim/transfer-windows.ts";
import {
  applyPlayerSaleIncome,
  applyTransferFee,
  canAffordTransfer,
  formatClubCash,
  spendClubCash,
  transferBudget,
  wageBudgetHeadroom,
  weeklyWageBill,
} from "./economy/club-finances.ts";
import { clearPlayerFromLineup } from "./match/lineup-board.ts";
import { formatPlayerName } from "./types/player-display.ts";
import { sellerAskingPrice, toggleShortlist } from "./transfers/negotiations.ts";
import { useTransferNegotiation } from "./ui/components/TransferNegotiationHost.tsx";
import { SpendConfirmSheet } from "./ui/components/SpendConfirmSheet.tsx";
import {
  infrastructureCostForWeek,
  isEarlyCapitalSeason,
  needsInfrastructureSpendConfirm,
} from "./economy/early-pacing.ts";
import {
  boardCashFloor,
  needsSpendConfirm,
  spendRunway,
} from "./economy/spend-runway.ts";
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
  createSaleRecord,
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
import {
  attemptPlayerSale,
  canSellPlayer,
  completeSale,
  estimateSaleOffer,
  pickAiBuyerClub,
} from "./transfers/player-sales.ts";
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
import { ClubEventsScreen } from "./ui/screens/ClubEventsScreen.tsx";
import { StadiumScreen } from "./ui/screens/StadiumScreen.tsx";
import { standings, type SandboxPlan, type TeamId } from "@fussballmanager/shared";
import { listJobOffers } from "./board/job-offers.ts";
import { switchManagerClub } from "./board/manager-club-switch.ts";
import { startBoardSeason } from "./board/season-objectives.ts";
import { applyScoutPlanToMatchLineup, type MatchLineupState } from "./match/lineup-board.ts";
import { saveTacticsPreset, type TacticsPresetId } from "./match/tactics-presets.ts";
import { JobOffersModal } from "./ui/components/JobOffersModal.tsx";
import {
  DEFAULT_FANBASE,
  STADIUM_BASE_BLOCKS,
  normalizeClubStadium,
  stadiumTotalCapacity,
} from "./stadium/club-stadium.ts";
import { clubDisplayName, clubShortLabel } from "./sim/league-divisions.ts";
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
  buyPrecinctExpansion,
  canBuyPrecinctExpansion,
  canNudgePrecinctPatch,
  canUpgradePrecinctBuilding,
  emptyPrecinct,
  nudgePrecinctPatch,
  placePrecinctBuilding,
  placeStreetRun,
  precinctHasTrainingHall,
  precinctPlacementCost,
  PRECINCT_BUILDINGS,
  shrinkPrecinctPatchToMin,
  upgradePrecinctBuilding,
  type PrecinctBuilding,
  type PrecinctEdge,
} from "./stadium/precinct.ts";
import { precinctInjuryRiskFactor } from "./stadium/precinct-effects.ts";
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
import { ScoutingCenter } from "./ui/screens/ScoutingCenter";
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
import { SaveManagerModal } from "./ui/components/SaveManagerModal.tsx";
import { NoticeToast, SaveToast } from "./ui/components/SaveToast.tsx";
import { YouthCampus } from "./ui/screens/YouthCampus";
import { CalendarScreen } from "./ui/screens/CalendarScreen.tsx";
import {
  collectCalendarMilestones,
  filterCalendarMilestonesForReveal,
} from "./ui/calendar/calendar-milestones.ts";
import { canBuyAcademyUpgrade, ACADEMY_FACILITIES } from "./youth/academy.ts";
import {
  buyYouthCamp,
  campNationById,
  canBuyYouthCamp,
  generateCampOpeningProspects,
  pullCampPlayerToHq,
} from "./youth/satellite-camps.ts";
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
  type PlayerProfileAction,
} from "./player/profile-actions.ts";
import { withClubEvent, type ClubEventKind } from "./inbox/club-events.ts";
import {
  actionLabel,
  applyInboxDecision,
  deliverDailyInbox,
  deliverInboxForDays,
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
import { useLocale, useT } from "./i18n/react.ts";
import type { LocaleId } from "./i18n/locale-id.ts";
import {
  applyAccessibilityPreferences,
  COLOR_SCHEME_OPTIONS,
  LOCALE_OPTIONS,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  TEXT_SCALE_OPTIONS,
  type AccessibilityPreferences,
  type ColorSchemeId,
  type TextScaleId,
} from "./ui/accessibility.ts";

type Screen =
  | "hub"
  | "training"
  | "campus"
  | "matchday"
  | "scouting"
  | "transfers"
  | "squad"
  | "finances"
  | "stadium"
  | "leagues"
  | "help"
  | "club-events"
  | "calendar"
  | "postfach";

const SCREEN_DOCUMENT_TITLE_KEYS: Record<Screen, string> = {
  hub: "shell.nav.pipeline",
  training: "shell.nav.training",
  campus: "shell.nav.campus",
  matchday: "shell.menu.matchdaySandbox",
  scouting: "shell.nav.scouting",
  transfers: "shell.nav.transfers",
  squad: "shell.nav.squad",
  finances: "shell.nav.finances",
  stadium: "shell.nav.stadium",
  leagues: "shell.nav.leagues",
  help: "shell.nav.help",
  "club-events": "shell.nav.clubEvents",
  calendar: "shell.nav.calendar",
  postfach: "shell.nav.postfach",
};

function bootstrapSave(slot: number): SaveGame {
  try {
    const loaded = loadLocalSave(slot);
    if (loaded) return loaded;
  } catch {
    removeLocalSave(slot);
  }
  const fresh = saveFromSession(newGameSession());
  writeLocalSave(slot, fresh);
  return fresh;
}

function clearTransientUi(
  setters: {
    setProfileId: (value: string | null) => void;
    setForeignPlayerId: (value: string | null) => void;
    setPostfachItemId: (value: string | null) => void;
    setProfileFeedback: (value: string | null) => void;
    setCareerMatchSetup: (value: CareerMatchSetup | null) => void;
    setCareerMatchUiVisible: (value: boolean) => void;
    setMatchNavAction: (value: NavPrimaryAction | null) => void;
    setMarketFilters: (value: MarketFilters) => void;
    setMarketSort: (value: MarketSort) => void;
    setScreen: (value: Screen) => void;
  },
) {
  setters.setProfileId(null);
  setters.setForeignPlayerId(null);
  setters.setPostfachItemId(null);
  setters.setProfileFeedback(null);
  setters.setCareerMatchSetup(null);
  setters.setCareerMatchUiVisible(true);
  setters.setMatchNavAction(null);
  setters.setMarketFilters(DEFAULT_MARKET_FILTERS);
  setters.setMarketSort(DEFAULT_MARKET_SORT);
  setters.setScreen("hub");
}

export default function App() {
  const locale = useLocale();
  const [screen, setScreen] = useState<Screen>("hub");
  const [activeSlot, setActiveSlotState] = useState(() => getActiveSlot());
  const [save, setSave] = useState<SaveGame>(() => bootstrapSave(getActiveSlot()));
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [postfachItemId, setPostfachItemId] = useState<string | null>(null);
  const [campLeaderDismissCampId, setCampLeaderDismissCampId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [careerMatchSetup, setCareerMatchSetup] = useState<CareerMatchSetup | null>(null);
  const [careerMatchUiVisible, setCareerMatchUiVisible] = useState(true);
  const careerMatchInLineupRef = useRef(true);
  const [matchNavAction, setMatchNavActionState] = useState<NavPrimaryAction | null>(null);
  const matchNavActionRef = useRef<NavPrimaryAction | null>(null);
  const careerMatchFlowRef = useRef(false);
  const setMatchNavAction = useCallback((action: NavPrimaryAction | null) => {
    matchNavActionRef.current = action;
    setMatchNavActionState(action);
  }, []);
  const [matchSkipToReport, setMatchSkipToReport] = useState<(() => void) | null>(null);
  /** Store skip handler in state — never pass it raw to setState (React treats functions as updaters). */
  const registerMatchSkipToReport = useCallback((handler: (() => void) | null) => {
    if (handler === null) {
      setMatchSkipToReport(null);
      return;
    }
    setMatchSkipToReport(() => handler);
  }, []);
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [marketSort, setMarketSort] = useState<MarketSort>(DEFAULT_MARKET_SORT);
  const [trainingFocusPlayerId, setTrainingFocusPlayerId] = useState<string | null>(null);
  const [clubProfileId, setClubProfileId] = useState<TeamId | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() =>
    loadAccessibilityPreferences(),
  );
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [campusInitialTab, setCampusInitialTab] = useState<"u17" | "u19" | "camps" | null>(null);
  const [scoutingInitialTab, setScoutingInitialTab] = useState<"network" | "hits" | null>(
    null,
  );
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
    apply: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>;
  } | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setProfileFeedback(null);
  }, [profileId]);

  useEffect(() => {
    if (screen !== "training") {
      setTrainingFocusPlayerId(null);
    }
  }, [screen]);

  const flashSaveToast = useCallback(() => {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToastVisible(true);
    saveToastTimerRef.current = setTimeout(() => setSaveToastVisible(false), 2000);
  }, []);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashNotice = useCallback((text: string, tone: "ok" | "warn" = "warn") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ text, tone });
    setProfileFeedback(text);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    applyAccessibilityPreferences(accessibility);
    saveAccessibilityPreferences(accessibility);
  }, [accessibility]);

  useEffect(() => {
    if (screen !== "scouting") {
      scoutMapDetailBackRef.current = null;
      setScoutMapDetailNav(null);
    }
  }, [screen]);

  const session = sessionFromSave(save);
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
  } = session;
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

  function sessionWithEvent(
    current: ReturnType<typeof sessionFromSave>,
    kind: ClubEventKind,
    message: string,
  ): ReturnType<typeof sessionFromSave> {
    return {
      ...current,
      clubEvents: withClubEvent(current.clubEvents, current.season, current.week, kind, message),
    };
  }

  const patchSession = useCallback((recipe: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>) => {
    setSave((current) => {
      const next = saveFromSession(recipe(sessionFromSave(current)), current);
      writeLocalSave(activeSlot, next);
      return next;
    });
    flashSaveToast();
  }, [activeSlot, flashSaveToast]);

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
      options?: { infrastructure?: boolean },
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
          apply,
        });
        return;
      }
      patchSession(apply);
    },
    [patchSession, players, session.clubId, session.week],
  );

  useEffect(() => {
    if (!careerMatchSetup || !assistantDelegation.lineup) return;
    patchSession((current) => {
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
        matchLineup: current.matchLineup,
        season: current.season,
        week: current.week,
        masterSeed: current.masterSeed,
        hasPlayerFixture: true,
      });
      if (!delegated.matchLineup) return current;
      return { ...current, matchLineup: delegated.matchLineup };
    });
  }, [careerMatchSetup, assistantDelegation.lineup, patchSession]);

  const finishWeekSimulation = useCallback(async (watchedMatch?: WatchedPlayerMatch | null) => {
    const snapshot = sessionFromSave(save);
    const override = watchedMatch ?? pendingWatchedMatch;
    const result = await simulateGameWeek(snapshot, override);
    setPendingWatchedMatch(null);
    setSave((current) => {
      const weekStamp = {
        season: result.session.season,
        week: result.session.week,
        weekday: MONDAY,
      };
      let nextSession = {
        ...result.session,
        weekday: MONDAY,
        trainingUnitsCompleted: 0,
        trainingCalendarGateDone: !resolveFeatureCurtain(result.session.storyState).auto_training
          ? false
          : true,
        matchPlayedThisWeek: false,
        youthInbox: deliverDailyInbox(result.session.youthInbox, {
          season: result.session.season,
          week: result.session.week,
          weekday: MONDAY,
          masterSeed: result.session.masterSeed,
        }, result.session.players),
        youthCamps: tickCampLeaderHires(result.session.youthCamps, weekStamp),
      };
      if (result.playerFixture) {
        nextSession = {
          ...nextSession,
          clubEvents: appendMatchdayClubEvents(
            nextSession.clubEvents,
            nextSession.season,
            nextSession.week,
            result.playerFixture,
            nextSession.league.player_club_id,
            result.matchdayStats,
          ),
        };
      }
      const next = saveFromSession(nextSession, current);
      writeLocalSave(activeSlot, next);
      return next;
    });
    flashSaveToast();
  }, [activeSlot, flashSaveToast, pendingWatchedMatch, save]);

  const simulateWeek = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      await finishWeekSimulation();
    } finally {
      setSimulating(false);
    }
  }, [finishWeekSimulation, simulating]);

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
    [finishWeekSimulation, patchSession, simulating],
  );
  const handleCareerMatchComplete = useCallback(
    (outcome: WatchedPlayerMatch) => void completeCareerMatch(outcome, false),
    [completeCareerMatch],
  );
  const handleCareerMatchSkip = useCallback(
    (outcome: WatchedPlayerMatch) => void completeCareerMatch(outcome, true),
    [completeCareerMatch],
  );

  const openPostfach = useCallback(
    (itemId?: string) => {
      const count = postfachOpenCount(youthInbox, players, youthCamps, scoutBoard);
      const pending = pendingInboxItems(youthInbox, players);
      const campItemIds = campsAwaitingLeaderChoice(youthCamps).map((camp) =>
        campLeaderPostfachItemId(camp.id),
      );
      const scoutJobIds = unconsumedScoutJobNotices(scoutBoard).map((notice) => notice.id);
      if (count === 0) return;
      if (
        itemId &&
        !pending.some((item) => item.id === itemId) &&
        !campItemIds.includes(itemId) &&
        !scoutJobIds.includes(itemId) &&
        !isScoutJobPostfachItemId(itemId)
      ) {
        setPostfachItemId(null);
      } else {
        setPostfachItemId(
          itemId ?? pending[0]?.id ?? campItemIds[0] ?? scoutJobIds[0] ?? null,
        );
      }
      setProfileId(null);
      setForeignPlayerId(null);
      setProfileFeedback(null);
      setScreen("postfach");
    },
    [players, scoutBoard, youthCamps, youthInbox],
  );

  const handleDismissScoutJob = useCallback(
    (itemId: string) => {
      patchSession((current) => {
        const notice = scoutJobNoticeById(current.scoutBoard, itemId);
        const next = {
          ...current,
          scoutBoard: consumeScoutJobNotice(current.scoutBoard, itemId),
        };
        const message = notice
          ? scoutJobDismissOneLiner(notice)
          : "Scout-Bericht geschlossen";
        return sessionWithEvent(next, "info", message);
      });
    },
    [patchSession],
  );

  const advanceScoutBoardForSession = useCallback(
    (current: typeof session, weekday: number) => {
      const club = current.world.clubs.find(
        (entry) => worldCareerClubId(entry.id) === current.clubId,
      );
      const division = club?.division_id ?? "regionalliga-nord";
      const opponentCtx = buildOpponentScoutWorkingDayContext(current);
      return advanceScoutWorkingDay(
        current.scoutBoard,
        weekday,
        current.rivalPlayers,
        current.scoutNetwork,
        current.world.clubs,
        current.season,
        current.week,
        division,
        opponentCtx,
      );
    },
    [],
  );

  const handleStartOpponentScout = useCallback(() => {
    const setup = prepareCareerMatch(session);
    if (!setup) {
      flashNotice(t("scouting.opponent.notMatchWeek"));
      return;
    }
    const { board, reason } = startOpponentScoutJob(
      session.scoutBoard,
      session.scoutNetwork,
      setup,
      session.season,
      session.week,
    );
    if (reason !== "ok") {
      const message =
        reason === "no_scout"
          ? t("scouting.opponent.noScout")
          : reason === "job_active"
            ? t("scouting.opponent.jobElsewhere")
            : t("scouting.opponent.notMatchWeek");
      flashNotice(message);
      return;
    }
    patchSession((current) => ({ ...current, scoutBoard: board }));
    flashNotice(t("scouting.opponent.started"), "ok");
  }, [flashNotice, patchSession, session]);

  const handleOpenOpponentScoutReport = useCallback(
    (itemId: string) => {
      if (careerMatchSetup && careerMatchUiVisible) {
        setCareerMatchUiVisible(false);
      }
      openPostfach(itemId);
    },
    [careerMatchSetup, careerMatchUiVisible, openPostfach],
  );

  const handleApplyOpponentScoutPlan = useCallback(
    (plan: SandboxPlan) => {
      const managerClubId = careerTeamId(session.league.player_club_id);
      patchSession((current) => ({
        ...current,
        matchLineup: applyScoutPlanToMatchLineup(
          current.matchLineup,
          plan,
          current.players,
          managerClubId,
          current.league.player_club_id,
        ),
      }));
      flashNotice(t("postfach.opponentScout.applied"), "ok");
    },
    [flashNotice, patchSession, session.league.player_club_id],
  );

  const handleNext = useCallback(() => {
    if (simulating) return;

    if (hasInboxBlockerForNext(session, youthInbox, players)) {
      openPostfach();
      return;
    }

    if (isTrainingCalendarGatePending(session)) {
      if (screen !== "calendar") {
        setScreen("calendar");
        return;
      }
      patchSession((current) => ({ ...current, trainingCalendarGateDone: true }));
      setScreen("training");
      flashNotice(t("training.next.weekStart"), "ok");
      return;
    }

    if (isTrainingNextActive(session)) {
      const preview = runTrainingNextStep(session);
      patchSession((current) => {
        const step = runTrainingNextStep(current);
        let nextSession = step.session;
        if (nextSession.weekday !== current.weekday) {
          nextSession = {
            ...nextSession,
            scoutBoard: advanceScoutBoardForSession(current, nextSession.weekday),
          };
        }
        return nextSession;
      });
      if (preview.openTrainingScreen) {
        setScreen("training");
      } else if (screen !== "training") {
        setScreen("training");
      }
      const toastParams =
        "params" in preview.toast && preview.toast.params
          ? { ...preview.toast.params }
          : undefined;
      if (toastParams?.attribute) {
        toastParams.attribute = attributeLabel(toastParams.attribute as keyof Attributes);
      }
      flashNotice(
        toastParams ? t(preview.toast.key, toastParams) : t(preview.toast.key),
        preview.openTrainingScreen ? "warn" : "ok",
      );
      return;
    }

    if (shouldNavigateToCalendarBeforeTimeStep(screen, false, session)) {
      setScreen("calendar");
      return;
    }

    const hasInbox = pendingInboxItems(youthInbox, players).length > 0;
    const skip = resolveSmartSkip(session, hasInbox);

    if (skip.action === "inbox") {
      openPostfach();
      return;
    }

    const inboxAfterDays =
      skip.daysAdvanced > 0
        ? deliverInboxForDays(
            session.youthInbox,
            {
              season: session.season,
              week: session.week,
              weekday: session.weekday,
              masterSeed: session.masterSeed,
            },
            skip.daysAdvanced,
            session.players,
          )
        : session.youthInbox;
    const sessionAtTarget = { ...session, weekday: skip.weekday, youthInbox: inboxAfterDays };

    if (skip.action === "match" || shouldOpenLineupFromCalendar(skip, session)) {
      if (skip.daysAdvanced > 0) {
        patchSession((current) => {
          const now = { season: current.season, week: current.week, weekday: skip.weekday };
          return {
            ...current,
            weekday: skip.weekday,
            youthInbox: deliverInboxForDays(
              current.youthInbox,
              {
                season: current.season,
                week: current.week,
                weekday: current.weekday,
                masterSeed: current.masterSeed,
              },
              skip.daysAdvanced,
              current.players,
            ),
            youthCamps: tickCampLeaderHires(current.youthCamps, now),
            scoutBoard: advanceScoutBoardForSession(current, skip.weekday),
          };
        });
      }
      const setup = prepareCareerMatch(sessionAtTarget);
      if (setup) {
        careerMatchFlowRef.current = true;
        setCareerMatchUiVisible(true);
        setCareerMatchSetup(setup);
        setScreen("hub");
      }
      return;
    }

    if (skip.action === "simulate_week") {
      void simulateWeek();
      return;
    }

    if (
      skip.action === "advance" &&
      skip.daysAdvanced > 0 &&
      shouldInjectTrainingReminderBeforeAdvance({
        delegation: session.assistantDelegation,
        trainingPlan: session.trainingPlan,
        youthInbox: session.youthInbox,
        session,
      })
    ) {
      const itemId = trainingReminderItemId(session.season, session.week);
      patchSession((current) => ({
        ...current,
        youthInbox: injectTrainingReminderInbox(current.youthInbox, current.season, current.week),
        trainingReminderWeek: { season: current.season, week: current.week },
      }));
      openPostfach(itemId);
      return;
    }

    if (skip.action === "advance" && skip.daysAdvanced > 0) {
      patchSession((current) => {
        const now = { season: current.season, week: current.week, weekday: skip.weekday };
        return {
          ...current,
          weekday: skip.weekday,
          youthInbox: deliverInboxForDays(
            current.youthInbox,
            {
              season: current.season,
              week: current.week,
              weekday: current.weekday,
              masterSeed: current.masterSeed,
            },
            skip.daysAdvanced,
            current.players,
          ),
          youthCamps: tickCampLeaderHires(current.youthCamps, now),
          scoutBoard: advanceScoutBoardForSession(current, skip.weekday),
        };
      });
    }
  }, [
    advanceScoutBoardForSession,
    flashNotice,
    openPostfach,
    patchSession,
    screen,
    session,
    simulating,
    simulateWeek,
    youthInbox,
    players,
  ]);

  const handleInboxDecision = useCallback(
    (itemId: string, action: DecisionAction) => {
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
        if (item && isStoryInboxItem(item)) {
          const choiceId = storyChoiceId(action);
          if (choiceId) {
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
        const playerName = player ? formatPlayerName(player) : "Spieler";
        const message =
          action === "loan" && result.transferRecord
            ? loanOutMessage(result.transferRecord)
            : action === "dismiss"
              ? `Entscheidung vertagt: ${playerName}`
              : `${actionLabel(action)}: ${playerName}`;
        const kind = action === "loan" ? "transfer" : "inbox";
        return sessionWithEvent(next, kind, message);
      });
    },
    [patchSession],
  );

  const handleOpeningComplete = useCallback(
    (origin: CareerOrigin, captainPlayerId: string, managerName: string) => {
      patchSession((current) => completeOpening(current, origin, captainPlayerId, managerName));
    },
    [patchSession],
  );

  const handleAssignScout = useCallback(
    (playerId: string) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: assignScout(current.scoutBoard, playerId, current.scoutNetwork),
      }));
    },
    [patchSession],
  );

  const handleEnqueueScoutTrip = useCallback(
    (
      zoneId: string,
      input: {
        pathNodeIds: string[];
        targetClubId: string;
        score: ScoutRouteScore;
      },
    ) => {
      patchSession((current) => {
        const club = current.world.clubs.find(
          (entry) => worldCareerClubId(entry.id) === input.targetClubId,
        );
        if (!club) return current;
        const division =
          current.world.clubs.find((entry) => worldCareerClubId(entry.id) === current.clubId)
            ?.division_id ?? "regionalliga-nord";
        const discovery = normalizeDiscovery(current.scoutBoard.discovery);
        if (!canEnqueueScoutTrip(club, division, discovery, current.world.clubs)) {
          return current;
        }
        const layout = layoutForZone(zoneId);
        if (!layout) return current;
        const zoneModel = buildScoutDiscoveryMapModel({
          clubs: current.world.clubs,
          targets: listBoardTargets(current.scoutBoard, current.rivalPlayers, current.world.clubs),
          rivalPlayers: current.rivalPlayers,
          discovery,
          playerDivisionId: division,
          activeClubScout: current.scoutBoard.active_scout_trip
            ? { club_id: current.scoutBoard.active_scout_trip.target_club_id, progress: 0 }
            : current.scoutBoard.active_club_scout,
        }).zones.find((zone) => zone.id === zoneId);
        if (!zoneModel) return current;
        const mapNodes = buildZoneMapNodes(layout, zoneModel.clubs, input.targetClubId);
        return {
          ...current,
          scoutBoard: enqueueScoutTrip(current.scoutBoard, {
            zoneId,
            pathNodeIds: input.pathNodeIds,
            mapNodes,
            targetClubId: input.targetClubId,
            routeScore: input.score,
            week: current.week,
            scouts: current.scoutNetwork,
          }),
        };
      });
    },
    [patchSession],
  );

  const handleScoutMapDetailChange = useCallback(
    (open: boolean, onBack: () => void, title?: string) => {
      scoutMapDetailBackRef.current = open ? onBack : null;
      setScoutMapDetailNav(
        open
          ? {
              onBack: () => scoutMapDetailBackRef.current?.(),
              title: title ?? "",
            }
          : null,
      );
    },
    [],
  );

  const handleScoutRegion = useCallback(
    (zoneId: string) => {
      patchSession((current) => {
        const discovery = normalizeDiscovery(current.scoutBoard.discovery);
        if (!canStartRegionScout(zoneId, discovery, current.scoutBoard.active_region_scout)) {
          return current;
        }
        return {
          ...current,
          scoutBoard: startRegionScoutJob(current.scoutBoard, zoneId),
        };
      });
    },
    [patchSession],
  );

  const handleHireScout = useCallback(
    (scout: HiredScout) => {
      patchSession((current) => {
        if (current.scoutNetwork.scouts.some((existing) => existing.id === scout.id)) {
          return current;
        }
        if (!canHireScout(current.scoutNetwork)) {
          return sessionWithEvent(current, "info", t("scouting.network.rosterFull"));
        }
        if (current.finances.cash < scout.wage_weekly * 4) {
          return sessionWithEvent(
            current,
            "finance",
            t("clubEvent.scoutHireInsufficientCash", { name: scout.name }),
          );
        }
        const scoutNetwork = hireScout(current.scoutNetwork, scout);
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork,
            scoutBoard: dispatchQueuedScoutTrips(current.scoutBoard, scoutNetwork),
          },
          "info",
          t("clubEvent.scoutHired", { name: scout.name }),
        );
      });
    },
    [patchSession],
  );

  const handleFireScout = useCallback(
    (scoutId: string) => {
      patchSession((current) => {
        const scout = current.scoutNetwork.scouts.find((entry) => entry.id === scoutId);
        if (!scout) return current;
        if (current.scoutNetwork.scouts.length <= 1) {
          return sessionWithEvent(current, "info", t("clubEvent.scoutNetworkMinimum"));
        }
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork: fireScout(current.scoutNetwork, scoutId),
          },
          "info",
          t("clubEvent.scoutFired", { name: scout.name }),
        );
      });
    },
    [patchSession],
  );

  const handleAssignMentor = useCallback(
    (menteeId: string, mentorId: string) => {
      patchSession((current) => {
        const mentee = current.players.find((player) => player.id === menteeId);
        const mentor = current.players.find((player) => player.id === mentorId);
        if (!mentee || !mentor) return current;
        const result = assignMentor(mentee, mentor, current.season, current.week);
        if ("error" in result) {
          return sessionWithEvent(current, "info", result.error);
        }
        return sessionWithEvent(
          {
            ...current,
            players: current.players.map((player) =>
              player.id === menteeId ? result.player : player,
            ),
          },
          "profile",
          result.message,
        );
      });
    },
    [patchSession],
  );

  const handleClearMentor = useCallback(
    (menteeId: string) => {
      patchSession((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === menteeId ? clearMentor(player) : player,
        ),
      }));
    },
    [patchSession],
  );

  const handleAddScoutAssignment = useCallback(() => {
    patchSession((current) => {
      const assignment = createScoutAssignment(
        `assign_${current.week}_${(current.scoutBoard.assignments ?? []).length + 1}`,
        {
          position: marketFilters.position,
          age: marketFilters.age,
          query: marketFilters.query,
          confidence: marketFilters.confidence,
        },
        undefined,
        { kind: "filter_sweep", weeksRemaining: 1 },
      );
      return {
        ...current,
        scoutBoard: addScoutAssignment(current.scoutBoard, assignment),
      };
    });
  }, [marketFilters, patchSession]);

  const handleCancelScoutWork = useCallback(
    (target: ScoutWorkCancelTarget) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: requestScoutWorkCancel(current.scoutBoard, target, {
          season: current.season,
          week: current.week,
          weekday: current.weekday,
        }),
      }));
    },
    [patchSession],
  );

  const handleToggleScoutAssignment = useCallback(
    (assignmentId: string) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: toggleScoutAssignment(current.scoutBoard, assignmentId),
      }));
    },
    [patchSession],
  );

  const handleAcceptJobOffer = useCallback(
    (clubId: TeamId) => {
      patchSession((current) => {
        const offer = listJobOffers(current.board.employer_club_id, current.season, current.league).find(
          (entry) => entry.clubId === clubId,
        );
        const bonus = offer?.signingBonus ?? 0;
        const nextBoard = startBoardSeason(
          { ...current.board, job_status: "employed", pressure: 0 },
          clubId,
          current.season,
        );
        const switched = switchManagerClub(
          {
            ...current,
            board: nextBoard,
            finances: { ...current.finances, cash: current.finances.cash + bonus },
          },
          clubId,
        );
        return sessionWithEvent(
          switched,
          "info",
          t("clubEvent.newJob", { club: offer?.clubName ?? clubId }),
        );
      });
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

  const handlePurchaseStadiumUpgrade = useCallback(
    (upgradeId: string) => {
      const check = canPurchaseStadiumUpgrade(stadium, finances, upgradeId);
      if (!check.allowed || check.cost === undefined) return;
      const def = stadiumUpgradeCatalog().find((entry) => entry.id === upgradeId);
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        def ? `${def.icon} ${def.name}` : "Tribünen-Ausbau",
        (current) => {
          const recheck = canPurchaseStadiumUpgrade(current.stadium, current.finances, upgradeId);
          if (!recheck.allowed || recheck.cost === undefined) return current;
          const fee = infrastructureCostForWeek(recheck.cost, current.week);
          const result = purchaseStadiumUpgrade(
            current.stadium,
            current.finances,
            upgradeId,
            STADIUM_BASE_BLOCKS,
            current.week,
            fee,
          );
          if (!result.ok) return current;
          return {
            ...current,
            stadium: normalizeClubStadium(result.stadium),
            finances: result.finances,
          };
        },
        { infrastructure: true },
      );
    },
    [finances, requestClubSpend, stadium, week],
  );

  const handlePlacePrecinct = useCallback(
    (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const baseCost = precinctPlacementCost(precinct, building, from);
      const cost = infrastructureCostForWeek(baseCost, week);
      if (cost > finances.cash) return;
      const def = PRECINCT_BUILDINGS.find((entry) => entry.id === building);
      requestClubSpend(
        cost,
        def ? `${def.icon} ${def.label}` : "Gelände",
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const actualBase = precinctPlacementCost(currentPrecinct, building, from);
          const actualCost = infrastructureCostForWeek(actualBase, current.week);
          if (actualCost > current.finances.cash) return current;
          const nextPrecinct = placePrecinctBuilding(currentPrecinct, x, y, building, from);
          if (nextPrecinct === currentPrecinct) return current;
          return {
            ...current,
            stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
            finances:
              actualCost === 0
                ? current.finances
                : spendClubCash(current.finances, actualCost, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleUpgradeAcademy = useCallback(() => {
    const check = canBuyAcademyUpgrade(
      academyFacility,
      stadiumTotalCapacity(stadium),
      finances.cash,
    );
    if (!check.ok) return;
    const def = ACADEMY_FACILITIES.find((entry) => entry.id === check.target);
    requestClubSpend(check.cost, def ? `${def.icon} ${def.name}` : "Jugend-Campus", (current) => {
      const next = canBuyAcademyUpgrade(
        current.academyFacility,
        stadiumTotalCapacity(current.stadium),
        current.finances.cash,
      );
      if (!next.ok) return current;
      return {
        ...current,
        academyFacility: next.target,
        finances: spendClubCash(current.finances, next.cost, current.week),
      };
    });
  }, [academyFacility, finances.cash, requestClubSpend, stadium]);

  const handleBuyYouthCamp = useCallback(
    (nationId: string) => {
      const check = canBuyYouthCamp(youthCamps, nationId, finances.cash);
      if (!check.ok) return;
      const nation = campNationById(nationId);
      requestClubSpend(
        check.cost,
        nation ? `${nation.flag} Camp ${nation.label}` : "Jugend-Camp",
        (current) => {
          const next = canBuyYouthCamp(current.youthCamps, nationId, current.finances.cash);
          if (!next.ok) return current;
          const youthCamps = buyYouthCamp(current.youthCamps, nationId, current.season);
          const opening = generateCampOpeningProspects({
            campId: nationId,
            clubId: current.clubId,
            season: current.season,
            week: current.week,
            masterSeed: current.masterSeed,
            players: current.players,
          });
          const players =
            opening.length > 0
              ? refreshAllMarketValues([...current.players, ...opening], current.season)
              : current.players;
          return {
            ...current,
            youthCamps,
            players,
            finances: spendClubCash(current.finances, next.cost, current.week),
          };
        },
      );
    },
    [finances.cash, requestClubSpend, youthCamps],
  );

  const handleCommissionCampLeader = useCallback(
    (nationId: string) => {
      const owned = youthCamps.find((camp) => camp.id === nationId);
      if (!owned || owned.leader_hire === "hired" || owned.leader_hire === "candidates_ready") {
        return;
      }
      if (owned.leader_hire === "agency_pending") {
        flashNotice(CAMP_LEADER_AGENCY_NOTICE, "ok");
        return;
      }
      patchSession((current) => ({
        ...current,
        youthCamps: commissionCampLeaderAgency(current.youthCamps, nationId, {
          season: current.season,
          week: current.week,
          weekday: current.weekday,
        }),
      }));
      flashNotice(CAMP_LEADER_AGENCY_NOTICE, "ok");
    },
    [flashNotice, patchSession, youthCamps],
  );

  const handleRequestDismissCampLeader = useCallback((nationId: string) => {
    setCampLeaderDismissCampId(nationId);
  }, []);

  const handleConfirmDismissCampLeader = useCallback(() => {
    if (!campLeaderDismissCampId) return;
    const nationId = campLeaderDismissCampId;
    setCampLeaderDismissCampId(null);
    patchSession((current) => ({
      ...current,
      youthCamps: dismissCampLeader(current.youthCamps, nationId),
    }));
  }, [campLeaderDismissCampId, patchSession]);

  const handleHireCampLeader = useCallback(
    (campId: string, candidate: CampLeaderCandidate) => {
      patchSession((current) => ({
        ...current,
        youthCamps: hireCampLeader(current.youthCamps, campId, candidate),
      }));
    },
    [patchSession],
  );

  const handlePullCampPlayer = useCallback(
    (playerId: string) => {
      patchSession((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === playerId ? pullCampPlayerToHq(player) : player,
        ),
      }));
    },
    [patchSession],
  );

  const handleUpgradePrecinct = useCallback(
    (building: PrecinctBuilding) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const check = canUpgradePrecinctBuilding(precinct, building, finances.cash);
      if (!check.allowed) return;
      const def = PRECINCT_BUILDINGS.find((entry) => entry.id === building);
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        def ? `${def.icon} ${def.label} Ausbau` : "Gelände-Ausbau",
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const nextCheck = canUpgradePrecinctBuilding(currentPrecinct, building, current.finances.cash);
          if (!nextCheck.allowed) return current;
          const fee = infrastructureCostForWeek(nextCheck.cost, current.week);
          return {
            ...current,
            stadium: normalizeClubStadium({
              ...current.stadium,
              precinct: upgradePrecinctBuilding(currentPrecinct, building),
            }),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleBuyParcel = useCallback(() => {
    const precinct = stadium.precinct ?? emptyPrecinct();
    const check = canBuyPrecinctExpansion(precinct, finances.cash);
    if (!check.allowed) return;
    const quoted = infrastructureCostForWeek(check.cost, week);
    requestClubSpend(
      quoted,
      t("spend.precinctExpansion"),
      (current) => {
        const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
        const nextCheck = canBuyPrecinctExpansion(currentPrecinct, current.finances.cash);
        if (!nextCheck.allowed) return current;
        const fee = infrastructureCostForWeek(nextCheck.cost, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({
            ...current.stadium,
            precinct: buyPrecinctExpansion(currentPrecinct),
          }),
          finances: spendClubCash(current.finances, fee, current.week),
        };
      },
      { infrastructure: true },
    );
  }, [finances.cash, requestClubSpend, stadium.precinct, week]);

  const handlePlaceStreet = useCallback(
    (cells: Array<{ x: number; y: number }>) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const preview = placeStreetRun(precinct, cells, finances.cash);
      if (preview.spent <= 0) return;
      const quoted = infrastructureCostForWeek(preview.spent, week);
      requestClubSpend(
        quoted,
        t("spend.street"),
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const result = placeStreetRun(currentPrecinct, cells, current.finances.cash);
          if (result.spent <= 0) return current;
          const fee = infrastructureCostForWeek(result.spent, current.week);
          return {
            ...current,
            stadium: normalizeClubStadium({
              ...current.stadium,
              precinct: result.state,
            }),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleExpandPrecinct = useCallback(
    (patchId: string, edge: PrecinctEdge, delta: 1 | -1 = 1) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const check = canNudgePrecinctPatch(precinct, patchId, edge, finances.cash, delta);
      if (!check.allowed) return;
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        t("spend.precinctGrow"),
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const nextCheck = canNudgePrecinctPatch(
            currentPrecinct,
            patchId,
            edge,
            current.finances.cash,
            delta,
          );
          if (!nextCheck.allowed) return current;
          const nextPrecinct = nudgePrecinctPatch(currentPrecinct, patchId, edge, delta);
          if (nextPrecinct === currentPrecinct) return current;
          const fee = infrastructureCostForWeek(nextCheck.cost, current.week);
          return {
            ...current,
            stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
            finances:
              fee === 0 ? current.finances : spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleShrinkPrecinctToMin = useCallback(
    (patchId: string) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const nextPrecinct = shrinkPrecinctPatchToMin(precinct, patchId);
        if (nextPrecinct === precinct) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
        };
      });
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

  const handleSell = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;

        const eligibility = canSellPlayer(
          player,
          current.players,
          current.clubId,
          current.week,
        );
        if (!eligibility.allowed) {
          return sessionWithEvent(
            current,
            "transfer",
            eligibility.reason ?? t("clubEvent.sellNotAllowed"),
          );
        }

        const buyerClubId = pickAiBuyerClub(
          current.league.club_ids,
          playerId,
          current.masterSeed,
          current.season,
          current.week,
        );
        const deal = attemptPlayerSale(
          player,
          current.season,
          current.week,
          current.masterSeed,
        );
        if (!deal.accepted) {
          return sessionWithEvent(
            current,
            "transfer",
            t("clubEvent.sellNoBuyer"),
          );
        }

        const sold = completeSale(player, buyerClubId, current.season);
        const shifted = processTransferBreakout(sold, {
          masterSeed: current.masterSeed,
          worldEventId: `sale_${current.season}_${current.week}_${playerId}_${buyerClubId}`,
          week: current.week,
          previousMorale: player.state.morale,
          matchFitPoor: false,
        });
        const finalized = shifted.player;
        const saleRecord = createSaleRecord(
          finalized,
          deal.fee,
          current.season,
          current.week,
          current.clubId,
          buyerClubId,
        );
        let next = sessionWithEvent(
          {
            ...current,
            players: current.players.filter((entry) => entry.id !== playerId),
            rivalPlayers: [
              ...current.rivalPlayers.filter((entry) => entry.id !== playerId),
              finalized,
            ],
            matchLineup: clearPlayerFromLineup(current.matchLineup, playerId),
            transferState: appendTransferRecord(current.transferState, saleRecord),
            finances: applyPlayerSaleIncome(current.finances, deal.fee, current.week),
          },
          "transfer",
          t("clubEvent.sellComplete", {
            player: formatPlayerName(player),
            club: loanClubName(buyerClubId),
            fee: formatClubCash(deal.fee),
          }),
        );
        for (const narrative of shifted.narratives) {
          next = sessionWithEvent(
            next,
            "profile",
            t("clubEvent.profileInsight", { narrative: narrative.narrative }),
          );
        }
        return next;
      });
      setProfileId(null);
      setProfileFeedback(null);
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
        }
        return next;
      });
    },
    [patchSession],
  );

  const handleContractOffer = useCallback(
    (playerId: string, offer: ContractOffer) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;
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
        const nextPlayers = current.players.map((entry) =>
          entry.id === playerId ? result.player : entry,
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

  const handleTrainingPlanChange = useCallback(
    (plan: TrainingSlot[]) => {
      patchSession((current) => ({ ...current, trainingPlan: plan }));
    },
    [patchSession],
  );

  const handleTrainingPlanPresetsChange = useCallback(
    (presets: TrainingPlanPresetSlot[]) => {
      patchSession((current) => ({ ...current, trainingPlanPresets: presets }));
    },
    [patchSession],
  );

  const handleAssistantDelegationChange = useCallback(
    (task: AssistantDelegationTask, enabled: boolean) => {
      patchSession((current) => ({
        ...current,
        assistantDelegation: normalizeAssistantDelegation({
          ...current.assistantDelegation,
          [task]: enabled,
        }),
      }));
    },
    [patchSession],
  );

  const handleHireCoach = useCallback(
    (coach: Coach) => {
      patchSession((current) => {
        if (current.finances.cash < coach.wage_weekly * 2) {
          return sessionWithEvent(
            current,
            "finance",
            t("clubEvent.coachInsufficientCash", {
              name: coach.name,
              amount: formatClubCash(coach.wage_weekly * 2),
            }),
          );
        }
        const currentCoach = current.coachingStaff[coach.role];
        if (currentCoach && coach.quality <= currentCoach.quality) {
          return sessionWithEvent(current, "info", t("clubEvent.coachNotBetter"));
        }
        return sessionWithEvent(
          {
            ...current,
            coachingStaff: hireCoach(current.coachingStaff, coach),
          },
          "info",
          t("clubEvent.coachHired", {
            role: COACH_ROLE_LABELS[coach.role],
            name: coach.name,
            quality: coach.quality,
          }),
        );
      });
    },
    [patchSession],
  );

  const handleTrainingIntensityChange = useCallback(
    (intensity: number) => {
      patchSession((current) => ({ ...current, trainingIntensity: intensity }));
    },
    [patchSession],
  );

  const handleIndividualProgramsChange = useCallback(
    (programs: IndividualProgram[]) => {
      patchSession((current) => ({ ...current, individualPrograms: programs }));
    },
    [patchSession],
  );

  const handleStartStampProgram = useCallback(
    (playerId: string, stampId: string) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;
        try {
          return {
            ...current,
            individualPrograms: assignIndividualProgram(
              current.individualPrograms,
              player,
              "stamp",
              8,
              current.season,
              current.week,
              undefined,
              stampId,
            ),
          };
        } catch {
          return current;
        }
      });
    },
    [patchSession],
  );

  const resetGame = useCallback(() => {
    removeLocalSave(activeSlot);
    const fresh = saveFromSession(newGameSession());
    writeLocalSave(activeSlot, fresh);
    setSave(fresh);
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
  }, [activeSlot]);

  const loadSaveSlot = useCallback(
    (slot: number) => {
      setActiveSlot(slot);
      setActiveSlotState(slot);
      try {
        const loaded = loadLocalSave(slot);
        if (loaded) {
          setSave(loaded);
        } else {
          const fresh = saveFromSession(newGameSession());
          writeLocalSave(slot, fresh);
          setSave(fresh);
        }
      } catch {
        removeLocalSave(slot);
        const fresh = saveFromSession(newGameSession());
        writeLocalSave(slot, fresh);
        setSave(fresh);
      }
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
    },
    [],
  );

  const newGameInSlot = useCallback((slot: number) => {
    removeLocalSave(slot);
    setActiveSlot(slot);
    setActiveSlotState(slot);
    const fresh = saveFromSession(newGameSession());
    writeLocalSave(slot, fresh);
    setSave(fresh);
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
  }, []);

  const jobOffers = listJobOffers(board.employer_club_id, season, league);
  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const openDecisionCount = postfachOpenCount(youthInbox, players, youthCamps, scoutBoard);

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
    if (!isNavScreenVisible(screen as CurtainNavScreen, storyState)) {
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

  const navActions: HubNavActions = {
    week,
    weekday,
    simulating,
    openDecisionCount,
    onNext: () => void handleNext(),
    onHeaderPrimaryClick: handleHeaderPrimaryClick,
    onNewGame: resetGame,
    onOpenSaves: () => setSaveManagerOpen(true),
    matchFlowActive: Boolean(careerMatchSetup && careerMatchUiVisible),
    primaryAction: matchFlowBrowsing
      ? backToLineupAction
      : careerMatchSetup && careerMatchUiVisible
        ? matchNavAction
        : null,
    matchSkipToReport: careerMatchSetup ? matchSkipToReport : null,
    nextHeaderTitle,
  };

  const saveManagerOverlay = saveManagerOpen ? (
    <SaveManagerModal
      activeSlot={activeSlot}
      currentSave={save}
      onClose={() => setSaveManagerOpen(false)}
      onLoadSlot={loadSaveSlot}
      onNewGameInSlot={newGameInSlot}
    />
  ) : null;

  const spendConfirmOverlay = pendingSpend ? (
    <SpendConfirmSheet
      title={pendingSpend.title}
      earlySeasonHint={pendingSpend.earlySeasonHint}
      runway={spendRunway(
        finances,
        weeklyWageBill(players, session.clubId),
        pendingSpend.cost,
        boardCashFloor(board),
      )}
      onConfirm={() => {
        const apply = pendingSpend.apply;
        setPendingSpend(null);
        patchSession(apply);
      }}
      onCancel={() => setPendingSpend(null)}
    />
  ) : null;

  const noticeOverlay = <NoticeToast message={notice?.text ?? null} tone={notice?.tone ?? "ok"} />;

  const careerBroadcastStory = useMemo(
    () =>
      careerMatchSetup
        ? buildBroadcastStoryContext(session, careerMatchSetup, rivalPlayers)
        : undefined,
    [careerMatchSetup, rivalPlayers, session.league, session.storyState, session.masterSeed, session.season],
  );

  const matchFanbaseMood = fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE);
  const matchPoorForm = teamPoorRecentForm(teamForm(league, board.employer_club_id, 3));

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
      <>
        <AppChrome
          screen="hub"
          week={week}
          weekday={weekday}
          trainingPlan={trainingPlan}
          storyState={storyState}
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={handleAppNavigate}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
          shellChrome="plain"
        />
        <CareerMatch
          setup={careerMatchSetup}
          players={players}
          week={week}
          weekday={weekday}
          tacticsPresets={tacticsPresets}
          matchLineup={matchLineup}
          rivalPlayers={rivalPlayers}
          onSaveTacticsPreset={handleSaveTacticsPreset}
          onSaveMatchLineup={handleSaveMatchLineup}
          simulating={simulating}
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
          kasse={matchdayCashBreakdown(stadium, careerMatchSetup.isHome)}
          homeStadiumCapacity={stadiumTotalCapacity(stadium)}
          fanbaseMood={matchFanbaseMood}
          poorForm={matchPoorForm}
          season={season}
          scoutBoard={scoutBoard}
          onOpenOpponentScoutReport={handleOpenOpponentScoutReport}
          onLineupPhaseChange={(inLineup) => {
            careerMatchInLineupRef.current = inLineup;
          }}
        />
        {saveManagerOverlay}
        {spendConfirmOverlay}
        {noticeOverlay}
      </>
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
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={handleAppNavigate}
          headerBack={shellHeaderBack}
          onCloseProfile={() => setForeignPlayerId(null)}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
        />
        <PlayerProfile
          player={foreignView.player}
          owned={purchaseCelebration}
          scoutEstimate={foreignView.estimate}
          scouting={foreignView.assigned}
          week={week}
          season={season}
          transferWindowOpen={isTransferWindowOpen(week)}
          transferBudget={transferBudget(finances)}
          purchasePrice={sellerAskingPrice(foreignView.player, season)}
          shortlisted={transferState.shortlist.includes(foreignView.player.id)}
          onAssignScout={() => handleAssignScout(foreignView.player.id)}
          onToggleShortlist={() => handleToggleShortlist(foreignView.player.id)}
          onPurchase={
            purchaseCelebration ? undefined : () => handleOpenNegotiation(foreignView.player.id)
          }
          actionFeedback={profileFeedback}
          onTransferNotice={(message) => {
            flashNotice(message);
          }}
          preContractBonus={preContractOffer(foreignView.player, season, week)?.signingBonus}
          preContractBlockedReason={(() => {
            const eligibility = canSignPreContract(
              foreignView.player,
              session.clubId,
              season,
              week,
              transferState.pending_transfers ?? [],
            );
            if (!eligibility.allowed) return eligibility.reason ?? null;
            const offer = preContractOffer(foreignView.player, season, week);
            if (!offer) return "Kein Vertrag.";
            if (!canAffordTransfer(finances, offer.signingBonus)) {
              return `Signaturbonus ca. ${formatClubCash(offer.signingBonus)} — Budget zu niedrig.`;
            }
            return null;
          })()}
          onPreContract={() => handlePreContract(foreignView.player.id)}
        />
        {negotiationOverlay}
        {saveManagerOverlay}
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
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={handleAppNavigate}
          headerBack={shellHeaderBack}
          onCloseProfile={() => setProfileId(null)}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
        />
        <PlayerProfile
          player={profilePlayer}
          owned
          week={week}
          season={season}
          weekday={weekday}
          transferWindowOpen={isTransferWindowOpen(week)}
          saleOffer={estimateSaleOffer(profilePlayer, season)}
          saleBlockedReason={(() => {
            const eligibility = canSellPlayer(profilePlayer, players, session.clubId, week);
            return eligibility.allowed ? null : eligibility.reason ?? null;
          })()}
          individualPrograms={individualPrograms}
          trainingPlan={trainingPlan}
          actionFeedback={profileFeedback}
          onTransferNotice={(message) => {
            flashNotice(message);
          }}
          onSell={() => handleSell(profilePlayer.id)}
          onProfileAction={(action) => handleProfileAction(profilePlayer.id, action)}
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
        {saveManagerOverlay}
        {spendConfirmOverlay}
        {noticeOverlay}
      </>
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
        cash={finances.cash}
        clubName={shellClub.name}
        clubInitials={shellClub.initials}
        clubLogoSrc={shellClub.logoSrc}
        leaguePlace={shellClub.leaguePlace}
        onNavigate={handleAppNavigate}
        headerBack={shellHeaderBack}
        onCampusNavigate={() => undefined}
        hubActions={navActions}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        shellChrome="card"
      />
      {screen === "hub" ? (
        <PipelineDashboard
          key={save.manifest.created}
          players={players}
          season={season}
          week={week}
          trainingPlan={trainingPlan}
          trainingIntensity={trainingIntensity}
          individualPrograms={individualPrograms}
          onTrainingPlanChange={handleTrainingPlanChange}
          activeScouts={activeScoutCount(scoutBoard)}
          league={league}
          finances={finances}
          board={board}
          clubId={session.clubId}
          onSelectPlayer={setProfileId}
          onOpenScouting={() => setScreen("scouting")}
          onOpenTransfers={() => setScreen("transfers")}
          onOpenPostfach={openPostfach}
          onStoryChoice={handleInboxDecision}
          onOpenJugend={() => setScreen("campus")}
          onSelectScoutTarget={(playerId) => setForeignPlayerId(playerId)}
          youthInbox={youthInbox}
          scoutBoard={scoutBoard}
          clubEvents={clubEvents}
          onOpenTraining={() => setScreen("training")}
          onViewAllEvents={() => setScreen("club-events")}
          lastSeasonAwards={lastSeasonAwards}
          storyState={storyState}
          youthCamps={youthCamps}
        />
      ) : null}
      {screen === "postfach" ? (
        <PostfachScreen
          players={players}
          youthInbox={youthInbox}
          youthCamps={youthCamps}
          clubId={session.clubId}
          season={season}
          week={week}
          storyCast={session.storyState.cast}
          masterSeed={session.masterSeed}
          initialItemId={postfachItemId}
          onDecision={handleInboxDecision}
          onSelectPlayer={setProfileId}
          onHireCampLeader={handleHireCampLeader}
          scoutBoard={scoutBoard}
          onDismissScoutJob={handleDismissScoutJob}
          onOpenScoutingNetwork={() => {
            setScoutingInitialTab("network");
            setScreen("scouting");
          }}
          onOpenScoutingHits={() => {
            setScoutingInitialTab("hits");
            setScreen("scouting");
          }}
          onApplyOpponentScoutPlan={handleApplyOpponentScoutPlan}
          clubEvents={clubEvents}
        />
      ) : null}
      {openingBlocked(session) ? (
        <OpeningStoryModal
          managerName={session.managerName}
          players={players}
          clubId={session.clubId}
          localeChosen={Boolean(accessibility.localeChosen)}
          onLocalePick={(locale: LocaleId) =>
            setAccessibility((current) => ({
              ...current,
              locale,
              localeChosen: true,
            }))
          }
          onComplete={handleOpeningComplete}
        />
      ) : null}
      {screen === "training" ? (
        <TrainingCenter
          week={week}
          weekday={weekday}
          season={season}
          plan={trainingPlan}
          intensity={trainingIntensity}
          individualPrograms={individualPrograms}
          onPlanChange={handleTrainingPlanChange}
          onIntensityChange={handleTrainingIntensityChange}
          onProgramsChange={handleIndividualProgramsChange}
          players={players}
          clubId={session.clubId}
          coachingStaff={coachingStaff}
          masterSeed={masterSeed}
          cash={finances.cash}
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          onSelectPlayer={setProfileId}
          focusIndividualPlayerId={trainingFocusPlayerId}
          onClearIndividualFocus={() => setTrainingFocusPlayerId(null)}
          hasTrainingHall={precinctHasTrainingHall(stadium.precinct)}
          injuryRiskFactor={precinctInjuryRiskFactor(stadium.precinct)}
          trainingUnitsCompleted={trainingUnitsCompleted}
          useTrainingUnitProgress={usesTrainingNextNexus(storyState)}
          trainingPlanPresets={trainingPlanPresets}
          onTrainingPlanPresetsChange={handleTrainingPlanPresetsChange}
          onTrainingPresetNotice={flashNotice}
        />
      ) : null}
      {campLeaderDismissCampId && youthCamps.some((entry) => entry.id === campLeaderDismissCampId) ? (
        <CampLeaderDismissModal
          camp={youthCamps.find((entry) => entry.id === campLeaderDismissCampId)!}
          onConfirm={handleConfirmDismissCampLeader}
          onCancel={() => setCampLeaderDismissCampId(null)}
        />
      ) : null}
      {screen === "campus" ? (
        <YouthCampus
          players={players}
          youthInbox={youthInbox}
          stadiumCapacity={stadiumTotalCapacity(stadium)}
          season={season}
          week={week}
          clubId={session.clubId}
          trainingPlan={trainingPlan}
          individualPrograms={individualPrograms}
          academyFacility={academyFacility}
          youthCamps={youthCamps}
          masterSeed={session.masterSeed}
          cash={finances.cash}
          onSelectPlayer={setProfileId}
          onOpenInbox={openPostfach}
          onInboxDecision={handleInboxDecision}
          onBuyCamp={handleBuyYouthCamp}
          onCommissionCampLeader={handleCommissionCampLeader}
          onRequestDismissCampLeader={handleRequestDismissCampLeader}
          onPullCampPlayer={handlePullCampPlayer}
          initialTab={campusInitialTab}
          onInitialTabApplied={() => setCampusInitialTab(null)}
        />
      ) : null}
      {screen === "scouting" ? (
        <ScoutingCenter
          targets={listBoardTargets(scoutBoard, rivalPlayers, world.clubs)}
          rivalPlayers={rivalPlayers}
          worldClubs={world.clubs}
          playerClub={
            world.clubs.find((entry) => worldCareerClubId(entry.id) === session.clubId) ?? null
          }
          discovery={scoutBoard.discovery}
          playerDivisionId={playerDivisionId}
          activeClubScout={scoutBoard.active_club_scout}
          activeRegionScout={scoutBoard.active_region_scout}
          activeOpponentScout={scoutBoard.active_opponent_scout}
          activeScoutTrips={scoutBoard.active_scout_trips ?? []}
          scoutTripQueue={scoutBoard.scout_trip_queue}
          tripQueueLength={scoutBoard.scout_trip_queue?.length ?? 0}
          onEnqueueScoutTrip={handleEnqueueScoutTrip}
          onScoutRegion={handleScoutRegion}
          filters={marketFilters}
          onFiltersChange={setMarketFilters}
          sort={marketSort}
          onSortChange={setMarketSort}
          assignments={scoutBoard.assignments ?? []}
          onAddAssignment={handleAddScoutAssignment}
          onCancelScoutWork={handleCancelScoutWork}
          onToggleAssignment={handleToggleScoutAssignment}
          onSelectTarget={(playerId) => setForeignPlayerId(playerId)}
          onAssignScout={handleAssignScout}
          scoutNetwork={scoutNetwork}
          scoutCapacity={scoutCapacity}
          season={season}
          week={week}
          masterSeed={masterSeed}
          cash={finances.cash}
          onHireScout={handleHireScout}
          onFireScout={handleFireScout}
          shortlistIds={transferState.shortlist}
          onToggleShortlist={handleToggleShortlist}
          initialTab={scoutingInitialTab}
          onInitialTabApplied={() => setScoutingInitialTab(null)}
          onScoutMapDetailChange={handleScoutMapDetailChange}
          opponentLabel={prepareCareerMatch(session)?.opponentShortName}
          matchSetup={prepareCareerMatch(session)}
        />
      ) : null}
      {screen === "transfers" ? (
        <TransfersScreen
          players={players}
          rivalPlayers={rivalPlayers}
          clubId={session.clubId}
          season={season}
          week={week}
          history={transferState.history}
          scoutTargetIds={Object.keys(scoutBoard.targets)}
          pending={transferState.pending_transfers ?? []}
          worldClubs={world.clubs}
          onSelectPlayer={setProfileId}
          onSelectForeignPlayer={setForeignPlayerId}
          onRecallLoan={handleRecallLoan}
        />
      ) : null}
      {screen === "squad" ? (
        <FirstTeam
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          trainingIntensity={trainingIntensity}
          coachingStaff={coachingStaff}
          masterSeed={masterSeed}
          cash={finances.cash}
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          injuryRiskFactor={precinctInjuryRiskFactor(stadium.precinct)}
          onSelectPlayer={setProfileId}
        />
      ) : null}
      {screen === "club-events" ? (
        <ClubEventsScreen events={clubEvents} />
      ) : null}
      {screen === "finances" ? (
        <FinancesScreen
          finances={finances}
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          stadium={stadium}
          league={league}
          coachingStaff={coachingStaff}
          scoutNetwork={scoutNetwork}
          boardCashFloor={boardCashFloor(board)}
          onOpenStadium={() => setScreen("stadium")}
        />
      ) : null}
      {screen === "leagues" ? (
        <LeaguesScreen
          league={league}
          season={season}
          masterSeed={session.masterSeed}
          players={players}
          rivalPlayers={rivalPlayers}
          worldClubs={world.clubs}
          stadium={stadium}
          onOpenStadium={() => setScreen("stadium")}
        />
      ) : null}
      {screen === "stadium" ? (
        <StadiumScreen
          stadium={stadium}
          finances={finances}
          season={season}
          onStadiumChange={(next) =>
            patchSession((current) => ({
              ...current,
              stadium: next,
            }))
          }
          onPurchaseUpgrade={handlePurchaseStadiumUpgrade}
          onPlacePrecinct={handlePlacePrecinct}
          onUpgradePrecinct={handleUpgradePrecinct}
          onBuyParcel={handleBuyParcel}
          onPlaceStreet={handlePlaceStreet}
          onExpandPrecinct={handleExpandPrecinct}
          onShrinkPrecinctToMin={handleShrinkPrecinctToMin}
          academyFacility={academyFacility}
          onUpgradeAcademy={handleUpgradeAcademy}
        />
      ) : null}
      {screen === "calendar" ? (
        <CalendarScreen
          season={season}
          week={week}
          weekday={weekday}
          league={league}
          milestones={calendarMilestones}
          matchSetup={prepareCareerMatch(session)}
          scoutBoard={scoutBoard}
          scoutNetwork={scoutNetwork}
          onStartOpponentScout={handleStartOpponentScout}
          onViewOpponentScoutReport={handleOpenOpponentScoutReport}
        />
      ) : null}
      {clubProfileId && screen !== "leagues" ? (
        <ClubProfileModal
          teamId={clubProfileId}
          league={league}
          players={players}
          rivalPlayers={rivalPlayers}
          stadium={stadium}
          worldClubs={world.clubs}
          onClose={() => setClubProfileId(null)}
          onOpenStadium={() => {
            setClubProfileId(null);
            setScreen("stadium");
          }}
        />
      ) : null}
      {screen === "help" ? <HelpScreen /> : null}
      {screen === "matchday" ? <Matchday /> : null}
      {board.job_status === "dismissed" ? (
        <JobOffersModal offers={jobOffers} onAccept={handleAcceptJobOffer} />
      ) : null}
      {saveManagerOverlay}
      {spendConfirmOverlay}
      {noticeOverlay}
      <SaveToast visible={saveToastVisible} />
    </>
  );
}

interface HubNavActions {
  week: number;
  weekday: number;
  simulating: boolean;
  openDecisionCount: number;
  onNext: () => void;
  onHeaderPrimaryClick?: () => void;
  onNewGame: () => void;
  onOpenSaves: () => void;
  /** When true, header NEXT must never fall back to smart-skip (match lineup / live). */
  matchFlowActive?: boolean;
  primaryAction?: NavPrimaryAction | null;
  matchSkipToReport?: (() => void) | null;
  nextHeaderTitle?: string;
}

function AppChrome({
  week,
  weekday,
  trainingPlan,
  storyState,
  cash,
  clubName,
  clubInitials,
  clubLogoSrc,
  leaguePlace,
  screen,
  onNavigate,
  headerBack,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
  accessibility,
  onAccessibilityChange,
  shellChrome = "card",
}: {
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  storyState: StoryState;
  cash: number;
  clubName: string;
  clubInitials: string;
  clubLogoSrc?: string;
  leaguePlace: number | null;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  headerBack?: { title: string; onBack: () => void; iconOnly?: boolean } | null;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  shellChrome?: "card" | "plain";
}) {
  return (
    <>
      <AppNav
        screen={screen}
        cash={cash}
        weekday={weekday}
        trainingPlan={trainingPlan}
        storyState={storyState}
        clubName={clubName}
        clubInitials={clubInitials}
        clubLogoSrc={clubLogoSrc}
        leaguePlace={leaguePlace}
        onNavigate={onNavigate}
        headerBack={headerBack}
        onCloseProfile={onCloseProfile}
        onCampusNavigate={onCampusNavigate}
        hubActions={hubActions}
        accessibility={accessibility}
        onAccessibilityChange={onAccessibilityChange}
        shellChrome={shellChrome}
        week={week}
      />
    </>
  );
}

function AppNav({
  screen,
  week,
  weekday,
  trainingPlan,
  storyState,
  cash,
  clubName,
  clubInitials,
  clubLogoSrc,
  leaguePlace,
  onNavigate,
  headerBack,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
  accessibility,
  onAccessibilityChange,
  shellChrome = "card",
}: {
  screen: Screen;
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  storyState: StoryState;
  cash: number;
  clubName: string;
  clubInitials: string;
  clubLogoSrc?: string;
  leaguePlace: number | null;
  onNavigate: (screen: Screen) => void;
  headerBack?: { title: string; onBack: () => void; iconOnly?: boolean } | null;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  shellChrome?: "card" | "plain";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tr = useT();
  const showTrainingPlanWarn =
    !suppressTrainingPlanWarning(storyState) &&
    needsTrainingPlanForToday(trainingPlan, weekday);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setResetAsk(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  const teamMenu = filterTeamNavScreens(
    [
      { screen: "hub" as const, labelKey: "shell.nav.pipeline" },
      {
        screen: "postfach" as const,
        labelKey: "shell.nav.postfach",
        labelSuffix:
          hubActions.openDecisionCount > 0 ? ` (${hubActions.openDecisionCount})` : undefined,
      },
      { screen: "squad" as const, labelKey: "shell.nav.squad" },
      { screen: "training" as const, labelKey: "shell.nav.training" },
      { screen: "campus" as const, labelKey: "shell.nav.campus" },
      { screen: "scouting" as const, labelKey: "shell.nav.scouting" },
      { screen: "transfers" as const, labelKey: "shell.nav.transfers" },
      { screen: "calendar" as const, labelKey: "shell.nav.calendar" },
      { screen: "leagues" as const, labelKey: "shell.nav.leagues" },
      { screen: "finances" as const, labelKey: "shell.nav.finances" },
      { screen: "stadium" as const, labelKey: "shell.nav.stadium" },
      { screen: "help" as const, labelKey: "shell.nav.help" },
    ],
    storyState,
  );

  return (
    <nav
      className={`app-nav club-shell-header ${shellChrome === "card" ? "club-shell-card-head" : "club-shell-grid"}`}
      aria-label={tr("shell.nav.areas")}
    >
      <div
        className={`club-shell-identity${headerBack ? " has-header-back" : ""}${headerBack?.iconOnly ? " is-icon-only-back" : ""}`}
      >
        {headerBack ? (
          <>
            <button
              type="button"
              className="club-shell-header-back"
              onClick={headerBack.onBack}
              aria-label={tr("shell.menu.back")}
            >
              <ArrowLeft size={22} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {!headerBack.iconOnly ? (
              <div className="club-shell-identity-text">
                <p className="club-shell-name club-shell-subscreen-title">{headerBack.title}</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <ClubCrest initials={clubInitials} logoSrc={clubLogoSrc} alt={clubName} />
            <div className="club-shell-identity-text">
              <p className="club-shell-name">{clubName}</p>
            </div>
          </>
        )}
      </div>
      <div className="app-nav-center" aria-live="polite" />
      <div className="app-nav-actions">
        <div className="app-nav-cash-wrap">
          {showTrainingPlanWarn ? (
            <button
              type="button"
              className="app-nav-training-warn"
              onClick={() => onNavigate("training")}
              aria-label={tr("shell.training.todayMissing")}
              title={tr("shell.training.todayMissing")}
            >
              <TriangleAlert size={18} strokeWidth={2.35} aria-hidden />
            </button>
          ) : null}
          <span className="app-nav-cash" aria-label={tr("shell.cash")}>
            {formatClubCash(cash)}
          </span>
        </div>
        {hubActions.matchSkipToReport ? (
          <button
            type="button"
            className="app-nav-match-simulate"
            title={tr("shell.match.simulate")}
            onClick={() => hubActions.matchSkipToReport?.()}
          >
            {tr("shell.match.simulate")}
          </button>
        ) : null}
        <div className="row-menu app-nav-menu" ref={menuRef}>
          <button
            type="button"
            className="row-menu-trigger app-nav-menu-trigger"
            aria-label={tr("shell.menu.moreActions")}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((open) => !open);
              if (menuOpen) {
                setResetAsk(false);
                setA11yOpen(false);
              }
            }}
          >
            <span className="app-nav-menu-link">Menu</span>
          </button>
          {menuOpen ? (
            <div className="row-menu-popover pipeline-menu-popover" role="menu">
              {resetAsk ? (
                <>
                  <p className="pipeline-menu-note">{tr("shell.menu.newGameConfirm")}</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item pipeline-menu-danger"
                    onClick={() => {
                      hubActions.onNewGame();
                      setResetAsk(false);
                      setMenuOpen(false);
                    }}
                  >
                    {tr("shell.menu.newGameYes")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => setResetAsk(false)}
                  >
                    {tr("shell.menu.cancel")}
                  </button>
                </>
              ) : a11yOpen ? (
                <>
                  <p className="pipeline-menu-note">{tr("shell.menu.displayNote")}</p>
                  <label className="a11y-menu-field">
                    <span>{tr("shell.menu.language")}</span>
                    <select
                      value={accessibility.locale}
                      onChange={(event) =>
                        onAccessibilityChange({
                          ...accessibility,
                          locale: event.target.value as LocaleId,
                          localeChosen: true,
                        })
                      }
                    >
                      {LOCALE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.nativeLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="a11y-menu-field">
                    <span>{tr("shell.menu.textScale")}</span>
                    <select
                      value={accessibility.textScale}
                      onChange={(event) =>
                        onAccessibilityChange({
                          ...accessibility,
                          textScale: event.target.value as TextScaleId,
                        })
                      }
                    >
                      {TEXT_SCALE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {tr(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="a11y-menu-field">
                    <span>{tr("shell.menu.colorScheme")}</span>
                    <select
                      value={accessibility.colorScheme}
                      onChange={(event) =>
                        onAccessibilityChange({
                          ...accessibility,
                          colorScheme: event.target.value as ColorSchemeId,
                        })
                      }
                    >
                      {COLOR_SCHEME_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {tr(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => setA11yOpen(false)}
                  >
                    {tr("shell.menu.back")}
                  </button>
                </>
              ) : (
                <>
                  <p className="pipeline-menu-section-title">TEAM</p>
                  {teamMenu.map((item) => (
                    <button
                      key={item.screen}
                      type="button"
                      role="menuitem"
                      className={`row-menu-item pipeline-menu-item${screen === item.screen ? " is-active" : ""}`}
                      onClick={() => {
                        onCloseProfile?.();
                        if (item.screen === "campus") {
                          onCampusNavigate?.();
                        }
                        onNavigate(item.screen);
                        setMenuOpen(false);
                      }}
                    >
                      {tr(item.labelKey)}
                      {item.labelSuffix ?? ""}
                    </button>
                  ))}
                  <p className="pipeline-menu-section-title">{tr("shell.menu.options")}</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => {
                      hubActions.onOpenSaves();
                      setMenuOpen(false);
                    }}
                  >
                    {tr("shell.menu.saves")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => setA11yOpen(true)}
                  >
                    {tr("shell.menu.display")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => {
                      onCloseProfile?.();
                      onNavigate("matchday");
                      setMenuOpen(false);
                    }}
                  >
                    {tr("shell.menu.matchdaySandbox")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item pipeline-menu-danger"
                    onClick={() => setResetAsk(true)}
                  >
                    {tr("shell.menu.resetGame")}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="app-nav-next"
          onClick={() => {
            if (hubActions.onHeaderPrimaryClick) {
              hubActions.onHeaderPrimaryClick();
              return;
            }
            hubActions.primaryAction?.onClick?.() ?? hubActions.onNext();
          }}
          disabled={
            hubActions.matchFlowActive
              ? hubActions.primaryAction?.disabled ?? !hubActions.primaryAction?.onClick
              : (hubActions.primaryAction?.disabled ?? hubActions.simulating)
          }
          title={
            hubActions.primaryAction?.title ??
            (hubActions.primaryAction
              ? hubActions.primaryAction.label
              : hubActions.nextHeaderTitle ?? tr("shell.smartSkip"))
          }
        >
          <span className="app-nav-next-mobile">{tr("shell.next")}</span>
          <span className="app-nav-next-desktop">
            {hubActions.simulating && !hubActions.primaryAction
              ? "…"
              : hubActions.primaryAction?.label ?? tr("shell.next")}
            {hubActions.openDecisionCount > 0 && !hubActions.primaryAction ? (
              <span className="app-nav-next-badge" aria-label={tr("hub.inbox.decisions")}>
                {hubActions.openDecisionCount}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </nav>
  );
}
