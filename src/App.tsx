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
import {
  loadLocalSave,
  normalizeSave,
  removeLocalSave,
  tryWriteLocalSave,
  writeLocalSave,
} from "./persistence/local-save.ts";
import {
  scheduleCloudUpload,
  setCloudUploadListener,
} from "./persistence/cloud-save-scheduler.ts";
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
import { ArrowLeft, HeartPulse, Package, TriangleAlert } from "lucide-react";
import { CashChip } from "./ui/components/CashChip.tsx";
import { ClubCrest } from "./ui/components/ClubCrest.tsx";
import { clubLogoUrlForPlayerClub } from "./ui/assets/club-logo.ts";
import { joinDocumentTitle, useDocumentTitle } from "./ui/document-title.ts";
import { prepareCareerMatch, type CareerMatchSetup } from "./sim/career-match-setup.ts";
import {
  buildOpponentScoutWorkingDayContext,
  startOpponentScoutJob,
} from "./scouting/opponent-scout-job.ts";
import type { WatchedPlayerMatch } from "./sim/watched-player-match.ts";
import { MONDAY, resolveSmartSkip, TUESDAY } from "./sim/day-calendar.ts";
import { archiveKickerEdition } from "./inbox/kicker-edition-archive.ts";
import {
  applyTuesdayKickerDelivery,
  kickerItemId,
  shouldDeliverKickerOnTuesday,
} from "./inbox/kicker-inbox.ts";
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
  applyPlayerSaleIncome,
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
import { listJobOffers } from "./board/job-offers.ts";
import { switchManagerClub } from "./board/manager-club-switch.ts";
import {
  applyCompanionPick,
  enqueueCompanionPickInbox,
  isCompanionPickBeat,
  pickCompanionCandidates,
} from "./board/companion-pick.ts";
import { startBoardSeason } from "./board/season-objectives.ts";
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
import { clubDisplayName, clubShortLabel } from "./sim/league-divisions.ts";
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
import { SaveManagerModal } from "./ui/components/SaveManagerModal.tsx";
import { NoticeToast, SaveToast } from "./ui/components/SaveToast.tsx";
import { CampOpeningDebutModal } from "./ui/components/CampOpeningDebutModal.tsx";
import { YouthCampus, type YouthCampusSortState } from "./ui/screens/YouthCampus";
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
  generateCampOpeningBundle,
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
  | "medical"
  | "finances"
  | "merchandising"
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
  medical: "shell.nav.medical",
  finances: "shell.nav.finances",
  merchandising: "shell.nav.merchandising",
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
  const [profileOpenContractTalk, setProfileOpenContractTalk] = useState(false);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [postfachItemId, setPostfachItemId] = useState<string | null>(null);
  const [campLeaderDismissCampId, setCampLeaderDismissCampId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [careerMatchSetup, setCareerMatchSetup] = useState<CareerMatchSetup | null>(null);
  const [careerMatchUiVisible, setCareerMatchUiVisible] = useState(true);
  const careerMatchInLineupRef = useRef(true);
  const matchLineupPrepKeyRef = useRef<string | null>(null);
  const [matchNavAction, setMatchNavActionState] = useState<NavPrimaryAction | null>(null);
  const matchNavActionRef = useRef<NavPrimaryAction | null>(null);
  const careerMatchFlowRef = useRef(false);
  const setMatchNavAction = useCallback((action: NavPrimaryAction | null) => {
    matchNavActionRef.current = action;
    setMatchNavActionState((prev) => {
      const same =
        prev === action ||
        (prev != null &&
          action != null &&
          prev.label === action.label &&
          prev.disabled === action.disabled &&
          prev.title === action.title);
      return same ? prev : action;
    });
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
    apply: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>;
  } | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campDebutAfterSpendRef = useRef<{ campId: string; playerId: string } | null>(null);
  const [campDebutReveal, setCampDebutReveal] = useState<{
    campId: string;
    playerId: string;
  } | null>(null);

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
    setCloudUploadListener((result) => {
      if (!result.ok) {
        flashNotice(t("save.cloud.uploadFail"), "warn");
      }
    });
    return () => setCloudUploadListener(null);
  }, [flashNotice]);

  useEffect(() => {
    if (screen !== "scouting") {
      scoutMapDetailBackRef.current = null;
      setScoutMapDetailNav(null);
    }
  }, [screen]);

  const session = useMemo(() => sessionFromSave(save), [save]);
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
    let persisted = true;
    let nextSave: SaveGame | null = null;
    setSave((current) => {
      const before = sessionFromSave(current, { refreshMarketValues: false });
      const after = recipe(before);
      nextSave = saveFromSession(after, current);
      persisted = tryWriteLocalSave(activeSlot, nextSave);
      return nextSave;
    });
    if (persisted) {
      flashSaveToast();
      if (nextSave) scheduleCloudUpload(activeSlot, nextSave);
    } else {
      flashNotice(t("shell.saveWriteFailed"), "warn");
    }
  }, [activeSlot, flashNotice, flashSaveToast]);

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

  const finalizeCampDebutReveal = useCallback(() => {
    const pending = campDebutAfterSpendRef.current;
    if (!pending) return;
    setCampDebutReveal(pending);
    campDebutAfterSpendRef.current = null;
  }, []);

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
      finalizeCampDebutReveal();
    },
    [finalizeCampDebutReveal, patchSession, players, session.clubId, session.week],
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

  const finishWeekSimulation = useCallback(async (watchedMatch?: WatchedPlayerMatch | null) => {
    const snapshot = sessionFromSave(save);
    const override = watchedMatch ?? pendingWatchedMatch;
    const result = await simulateGameWeek(snapshot, override);
    setPendingWatchedMatch(null);
    let weekSimPersisted = true;
    let weekSimSave: SaveGame | null = null;
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
        trainingUnitOutcomes: [],
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
      weekSimSave = next;
      weekSimPersisted = tryWriteLocalSave(activeSlot, next);
      return next;
    });
    if (weekSimPersisted) {
      flashSaveToast();
      if (weekSimSave) scheduleCloudUpload(activeSlot, weekSimSave);
    } else {
      flashNotice(t("shell.saveWriteFailed"), "warn");
    }
  }, [activeSlot, flashNotice, flashSaveToast, pendingWatchedMatch, save]);

  const simulateWeek = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      await finishWeekSimulation();
    } catch (error) {
      console.error("Week simulation failed", error);
      flashNotice(t("shell.weekSimFailed"), "warn");
    } finally {
      setSimulating(false);
    }
  }, [finishWeekSimulation, flashNotice, simulating]);

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
      if (count === 0) return;
      if (
        itemId &&
        !pending.some((item) => item.id === itemId) &&
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

  const CALENDAR_MONTH_KEYS = [
    "calendar.month.january",
    "calendar.month.february",
    "calendar.month.march",
    "calendar.month.april",
    "calendar.month.may",
    "calendar.month.june",
    "calendar.month.july",
    "calendar.month.august",
    "calendar.month.september",
    "calendar.month.october",
    "calendar.month.november",
    "calendar.month.december",
  ] as const;

  const handleFastForwardToMonth = useCallback(
    async (targetMonthIndex: number) => {
      if (simulating) return;
      setSimulating(true);
      try {
        const snapshot = sessionFromSave(save);
        const advanceSessionDays = (
          current: typeof snapshot,
          daysAdvanced: number,
          targetWeekday: number,
        ) => {
          const now = {
            season: current.season,
            week: current.week,
            weekday: targetWeekday,
          };
          let next = {
            ...current,
            weekday: targetWeekday,
            youthInbox: deliverInboxForDays(
              current.youthInbox,
              {
                season: current.season,
                week: current.week,
                weekday: current.weekday,
                masterSeed: current.masterSeed,
              },
              daysAdvanced,
              current.players,
            ),
            youthCamps: tickCampLeaderHires(current.youthCamps, now),
            scoutBoard: advanceScoutBoardForSession(current, targetWeekday),
          };
          next = tickMedicalSessionDays(next, daysAdvanced);
          return applyTuesdayKickerDelivery(next);
        };
        const simulateWeekForFastForward = async (current: typeof snapshot) => {
          const result = await simulateGameWeek(current);
          let next = sessionAfterWeekSimulation(result.session);
          const weekStamp = {
            season: next.season,
            week: next.week,
            weekday: MONDAY,
          };
          next = {
            ...next,
            trainingCalendarGateDone: !resolveFeatureCurtain(next.storyState).auto_training
              ? false
              : true,
            youthInbox: deliverDailyInbox(
              next.youthInbox,
              {
                season: next.season,
                week: next.week,
                weekday: MONDAY,
                masterSeed: next.masterSeed,
              },
              next.players,
            ),
            youthCamps: tickCampLeaderHires(next.youthCamps, weekStamp),
          };
          return next;
        };
        const outcome = await Promise.race([
          fastForwardToMonthEnd(snapshot, targetMonthIndex, {
            simulateWeek: simulateWeekForFastForward,
            advanceSessionDays,
            onProgress: async (sessionAfterStep) => {
              await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 0);
              });
              setSave((current) => saveFromSession(sessionAfterStep, current));
            },
          }),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error("Fast-forward timeout (90s)")),
              90_000,
            );
          }),
        ]);
        const monthLabel = t(
          CALENDAR_MONTH_KEYS[targetMonthIndex] ?? "calendar.month.january",
        );
        let weekSimPersisted = true;
        setSave((current) => {
          const next = saveFromSession(outcome.session, current);
          weekSimPersisted = tryWriteLocalSave(activeSlot, next);
          return next;
        });
        if (weekSimPersisted) {
          flashSaveToast();
        } else {
          flashNotice(t("shell.saveWriteFailed"), "warn");
        }
        if (outcome.reason === "reached") {
          flashNotice(
            t("calendar.fastForward.done", {
              month: monthLabel,
              steps: String(outcome.steps),
            }),
            "ok",
          );
        } else if (outcome.reason === "training_plan") {
          flashNotice(t("calendar.fastForward.trainingPlan"), "warn");
        } else if (outcome.reason === "season_complete") {
          flashNotice(t("calendar.fastForward.seasonComplete"), "warn");
        } else if (outcome.reason === "limit") {
          flashNotice(
            t("calendar.fastForward.limit", { steps: String(outcome.steps) }),
            "warn",
          );
        } else if (outcome.reason === "stall") {
          flashNotice(t("calendar.fastForward.stall"), "warn");
        }
      } catch (error) {
        console.error("Fast-forward failed", error);
        const detail = error instanceof Error ? error.message : String(error);
        flashNotice(
          import.meta.env.DEV
            ? `${t("shell.weekSimFailed")} (${detail})`
            : t("shell.weekSimFailed"),
          "warn",
        );
      } finally {
        setSimulating(false);
      }
    },
    [
      activeSlot,
      advanceScoutBoardForSession,
      flashNotice,
      flashSaveToast,
      save,
      simulating,
    ],
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

  const handleNext = useCallback((trigger?: { fromAuto?: boolean }) => {
    const fromAuto = trigger?.fromAuto === true;
    if (simulating) return;

    const careerMatchActive = Boolean(careerMatchSetup && careerMatchUiVisible);
    const pauseAuto = shouldPauseTrainingAutoNext({
      session,
      youthInbox,
      players,
      screen,
      simulating,
      careerMatchActive,
    });

    if (fromAuto) {
      if (pauseAuto) {
        setTrainingAutoNext(false);
        return;
      }
    } else if (screen === "training") {
      setTrainingAutoNext(!pauseAuto);
    }

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
      const deliverKickerAfterStep =
        preview.session.weekday === TUESDAY &&
        shouldDeliverKickerOnTuesday({
          session: { ...session, weekday: TUESDAY },
          inbox: session.youthInbox,
          targetWeekday: TUESDAY,
        });
      patchSession((current) => {
        const step = runTrainingNextStep(current);
        let nextSession = step.session;
        if (nextSession.weekday !== current.weekday) {
          nextSession = {
            ...nextSession,
            stadium: deliverMerchandisingOrders(
              current.stadium,
              nextSession.season,
              nextSession.week,
              nextSession.weekday,
            ),
            scoutBoard: advanceScoutBoardForSession(current, nextSession.weekday),
          };
          nextSession = tickMedicalSessionDay(nextSession);
        }
        return deliverKickerAfterStep ? applyTuesdayKickerDelivery(nextSession) : nextSession;
      });
      if (deliverKickerAfterStep) {
        const treterId = kickerItemId(session.season, session.week);
        setPostfachItemId(treterId);
        setProfileId(null);
        setForeignPlayerId(null);
        setProfileFeedback(null);
        setScreen("postfach");
      }
      if (preview.openTrainingScreen) {
        setScreen("training");
      } else if (screen !== "training") {
        setScreen("training");
      }
      const silentToast =
        preview.toast.key === "training.next.unitResult" ||
        preview.toast.key === "training.next.unitResultQuiet";
      if (!silentToast) {
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
      }
      return;
    }

    if (
      shouldNavigateToCalendarBeforeTimeStep(
        screen,
        hasInboxBlockerForNext(session, youthInbox, players),
        session,
      )
    ) {
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
          const stepped = {
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
          return tickMedicalSessionDays(stepped, skip.daysAdvanced);
        });
      }
      const setup = prepareCareerMatch(sessionAtTarget);
      if (setup) {
        careerMatchFlowRef.current = true;
        setCareerMatchUiVisible(true);
        setCareerMatchSetup(setup);
        setScreen("hub");
        return;
      }
    }

    if (skip.action === "simulate_week") {
      void simulateWeek();
      return;
    }

    if (skip.action === "advance" && skip.daysAdvanced > 0) {
      const landOnTuesday =
        skip.weekday === TUESDAY &&
        shouldDeliverKickerOnTuesday({
          session: { ...session, weekday: skip.weekday },
          inbox: session.youthInbox,
          targetWeekday: TUESDAY,
        });
      patchSession((current) => {
        const now = { season: current.season, week: current.week, weekday: skip.weekday };
        let next = {
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
        next = tickMedicalSessionDays(next, skip.daysAdvanced);
        next = applyTuesdayKickerDelivery(next);
        return next;
      });
      if (landOnTuesday) {
        const treterId = kickerItemId(session.season, session.week);
        setPostfachItemId(treterId);
        setProfileId(null);
        setForeignPlayerId(null);
        setProfileFeedback(null);
        setScreen("postfach");
      }
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
    careerMatchSetup,
    careerMatchUiVisible,
  ]);

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

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
        const playerName = player ? formatPlayerName(player) : "Spieler";
        const message =
          action === "loan" && result.transferRecord
            ? loanOutMessage(result.transferRecord)
            : action === "dismiss"
              ? `Entscheidung vertagt: ${playerName}`
              : `${actionLabel(action)}: ${playerName}`;
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
        const oldTeamId = current.league.player_club_id;
        const oldCareerId = current.clubId;
        const oldPros = current.players.filter(
          (player) => player.squad_status === "pro" && player.club_id === oldCareerId,
        );
        const companions = pickCompanionCandidates(
          oldPros,
          current.masterSeed,
          oldTeamId,
          current.season,
        );
        const nextBoard = startBoardSeason(
          { ...current.board, job_status: "employed", pressure: 0 },
          clubId,
          current.season,
          current.league,
          current,
        );
        let switched = switchManagerClub(
          {
            ...current,
            board: nextBoard,
          },
          clubId,
        );
        switched = {
          ...switched,
          finances: {
            ...switched.finances,
            cash: switched.finances.cash + bonus,
          },
          youthInbox: enqueueCompanionPickInbox(switched.youthInbox, switched.week, companions, oldTeamId),
        };
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

  const handleMerchandisingChange = useCallback(
    (next: typeof stadium) => {
      patchSession((current) => {
        if (next === current.stadium) return current;
        return { ...current, stadium: next };
      });
    },
    [patchSession],
  );

  const merchSyncStampRef = useRef<string | null>(null);
  useEffect(() => {
    if (screen !== "merchandising") return;
    const stamp = `${season}-${week}-${weekday}`;
    if (merchSyncStampRef.current === stamp) return;
    merchSyncStampRef.current = stamp;
    patchSession((current) => {
      let nextStadium = deliverMerchandisingOrders(
        current.stadium,
        current.season,
        current.week,
        current.weekday,
      );
      nextStadium = ensureMerchBulkMarket(
        nextStadium,
        current.season,
        current.week,
        current.masterSeed,
      );
      if (nextStadium === current.stadium) return current;
      return { ...current, stadium: nextStadium };
    });
  }, [screen, season, week, weekday, patchSession]);

  const handleMerchBulkPurchase = useCallback(
    (offerId: string) => {
      const fresh = ensureMerchBulkMarket(stadium, season, week, masterSeed);
      const preview = buyBulkOffer(fresh, offerId, season, week);
      if (!preview || !canAffordMerchPurchase(finances, preview.cost)) return;
      requestClubSpend(
        preview.cost,
        "Merchandising · Whitelabel-Paket",
        (session) => {
          const synced = ensureMerchBulkMarket(
            session.stadium,
            session.season,
            session.week,
            session.masterSeed,
          );
          const next = buyBulkOffer(synced, offerId, session.season, session.week);
          if (!next || !canAffordMerchPurchase(session.finances, next.cost)) return session;
          return {
            ...session,
            stadium: normalizeClubStadium(next.stadium),
            finances: spendClubCash(session.finances, next.cost, session.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances, masterSeed, requestClubSpend, season, stadium, week],
  );

  const handleMerchSaleStart = useCallback(
    (sku: MerchSkuId, salePrice: number) => {
      patchSession((current) => ({
        ...current,
        stadium: normalizeClubStadium(
          startMerchSkuSale(current.stadium, sku, salePrice, current.season, current.week),
        ),
      }));
    },
    [patchSession],
  );

  const handleMerchOnDemand = useCallback(
    (sku: MerchSkuId, qty: number) => {
      const preview = orderMerchOnDemand(stadium, sku, qty, season, week, weekday);
      if (!preview || !canAffordMerchPurchase(finances, preview.cost)) return;
      requestClubSpend(
        preview.cost,
        "Merchandising · On Demand",
        (session) => {
          const next = orderMerchOnDemand(
            session.stadium,
            sku,
            qty,
            session.season,
            session.week,
            session.weekday,
          );
          if (!next || !canAffordMerchPurchase(session.finances, next.cost)) return session;
          return {
            ...session,
            stadium: normalizeClubStadium(next.stadium),
            finances: spendClubCash(session.finances, next.cost, session.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances, requestClubSpend, season, stadium, week, weekday],
  );

  const handleDrawBankLoan = useCallback(
    (amount: number) => {
      patchSession((current) => {
        const wageBill = weeklyWageBill(current.players, current.clubId);
        const eligibility = evaluateBankLoan({
          finances: current.finances,
          wageBillWeekly: wageBill,
          runwayWeeks: weeksOfWages(current.finances.cash, wageBill),
          leaguePlace: leagueTablePlace(current.league),
          leagueSize: current.league.club_ids.length,
          boardPressure: current.board.pressure,
          divisionId: current.league.division_id as DivisionEconomyId,
          financing: current.financing,
          season: current.season,
          week: current.week,
        });
        const drawn = drawBankLoan(
          current.finances,
          current.financing,
          amount,
          eligibility,
          current.season,
          current.week,
        );
        if (!drawn) return current;
        return {
          ...current,
          finances: drawn.finances,
          financing: drawn.financing,
        };
      });
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

  const handleStartBlockExpansion = useCallback(
    (blockId: string) => {
      const block = stadium.blocks.find((entry) => entry.id === blockId);
      const check = canStartBlockExpansion(stadium, blockId, season, week, finances.cash);
      if (!check.allowed || check.cost === undefined) return;
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        block ? `${block.name} · Stufe ${check.nextLevel}` : "Tribünen-Ausbau",
        (current) => {
          const recheck = canStartBlockExpansion(
            current.stadium,
            blockId,
            current.season,
            current.week,
            current.finances.cash,
          );
          if (!recheck.allowed || recheck.cost === undefined) return current;
          const fee = infrastructureCostForWeek(recheck.cost, current.week);
          if (fee > current.finances.cash) return current;
          return {
            ...current,
            stadium: normalizeClubStadium(
              startBlockExpansion(current.stadium, blockId, current.season, current.week),
            ),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, season, stadium, week],
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
          const hadRestaurant = occupiedCells(currentPrecinct, "restaurant") > 0;
          const nextPrecinct = placePrecinctBuilding(currentPrecinct, x, y, building, from);
          if (nextPrecinct === currentPrecinct) return current;
          let nextStadium = normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct });
          let nextPlayers = current.players;
          let nextClubEvents = current.clubEvents;
          if (building === "restaurant" && !hadRestaurant) {
            const story = applyRestaurantProposalStory(
              nextStadium,
              current.players,
              current.clubId,
              current.season,
              current.week,
            );
            nextStadium = normalizeClubStadium(story.stadium);
            nextPlayers = [...story.players];
            nextClubEvents = withClubEvent(
              nextClubEvents,
              current.season,
              current.week,
              "info",
              story.clubEventMessage,
            );
          }
          return {
            ...current,
            stadium: nextStadium,
            players: nextPlayers,
            clubEvents: nextClubEvents,
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
          const youthCamps = buyYouthCamp(
            current.youthCamps,
            nationId,
            current.season,
            current.week,
          );
          const opening = generateCampOpeningBundle({
            campId: nationId,
            clubId: current.clubId,
            season: current.season,
            week: current.week,
            masterSeed: current.masterSeed,
            players: current.players,
            facility: current.academyFacility,
          });
          if (opening.headlinePlayerId) {
            campDebutAfterSpendRef.current = {
              campId: nationId,
              playerId: opening.headlinePlayerId,
            };
          }
          const players =
            opening.players.length > 0
              ? refreshAllMarketValues([...current.players, ...opening.players], current.season)
              : current.players;
          const headline = opening.players.find((p) => p.id === opening.headlinePlayerId);
          const clubEvents =
            headline && nation
              ? withClubEvent(
                  current.clubEvents,
                  current.season,
                  current.week,
                  "info",
                  `${nation.flag} Camp ${nation.label}: ${formatPlayerName(headline)} stellt sich vor — drei Talente im Kader.`,
                )
              : current.clubEvents;
          return {
            ...current,
            youthCamps,
            players,
            clubEvents,
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
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const check = canNudgePrecinctPatch(precinct, patchId, edge, current.finances.cash, delta);
        if (!check.allowed) return current;
        const nextPrecinct = nudgePrecinctPatch(precinct, patchId, edge, delta);
        if (nextPrecinct === precinct) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
        };
      });
    },
    [patchSession],
  );

  const handleRemovePrecinctPatch = useCallback(
    (patchId: string) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const result = removePrecinctPatch(precinct, patchId);
        if (result.refund <= 0 && result.state === precinct) return current;
        const credit = infrastructureCostForWeek(result.refund, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: result.state }),
          finances: creditClubCash(current.finances, credit, current.week),
        };
      });
    },
    [patchSession],
  );

  const handleRemoveStreet = useCallback(
    (x: number, y: number) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const result = removeStreetCell(precinct, x, y);
        if (result.refund <= 0) return current;
        const credit = infrastructureCostForWeek(result.refund, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: result.state }),
          finances: creditClubCash(current.finances, credit, current.week),
        };
      });
    },
    [patchSession],
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

  const handleHireMedicalDoctor = useCallback(
    (member: MedicalMember) => {
      patchSession((current) => {
        if (current.finances.cash < member.wage_weekly * 4) {
          return sessionWithEvent(current, "finance", t("medical.event.insufficientCash"));
        }
        if (current.medicalStaff.doctor) {
          return sessionWithEvent(current, "info", t("medical.event.doctorSlotFull"));
        }
        return {
          ...current,
          medicalStaff: hireMedicalDoctor(current.medicalStaff, member),
        };
      });
    },
    [patchSession],
  );

  const handleHireMedicalPhysio = useCallback(
    (member: MedicalMember) => {
      patchSession((current) => {
        if (current.finances.cash < member.wage_weekly * 4) {
          return sessionWithEvent(current, "finance", t("medical.event.insufficientCash"));
        }
        return {
          ...current,
          medicalStaff: hireMedicalPhysio(current.medicalStaff, member),
        };
      });
    },
    [patchSession],
  );

  const handleHireOrthopedist = useCallback(
    (candidate: OrthopedistCandidate) => {
      patchSession((current) => {
        const member = orthopedistFromCandidate(candidate, current.season);
        return {
          ...current,
          medicalStaff: hireMedicalOrthopedist(current.medicalStaff, member),
          orthopedistHire: clearOrthopedistHireAfterPick(),
        };
      });
      flashNotice(t("medical.event.orthoHired", { name: candidate.name }), "ok");
    },
    [flashNotice, patchSession],
  );

  const handleDoctorExamComplete = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const row = current.medicalState.pending_diagnoses.find((entry) => entry.player_id === playerId);
        if (!row) return current;
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const mods = medicalModifiers(
          normalizeMedicalStaff(current.medicalStaff),
          level,
          1,
        );
        const exam = completeDoctorExam(
          current.medicalState,
          row,
          level,
          current.medicalStaff,
          current.masterSeed,
        );
        let next: typeof current = { ...current, medicalState: exam.state };
        if (exam.nextPhase === "rehab") {
          next = {
            ...next,
            players: applyPendingRowToPlayer(next.players, row, mods.recoveryMultiplier, false),
          };
        }
        return next;
      });
    },
    [patchSession],
  );

  const handleSurgery = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const row = current.medicalState.pending_diagnoses.find(
          (entry) => entry.player_id === playerId && entry.phase === "awaiting_surgery",
        );
        if (!row) return current;
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const mods = medicalModifiers(
          normalizeMedicalStaff(current.medicalStaff),
          level,
          1,
        );
        return {
          ...current,
          medicalState: completeInHouseSurgery(current.medicalState, row),
          players: applyPendingRowToPlayer(current.players, row, mods.recoveryMultiplier, true),
        };
      });
      flashNotice(t("medical.event.surgeryDone"), "ok");
    },
    [flashNotice, patchSession],
  );

  const handlePhysioManual = useCallback(
    (playerId: string, success: boolean) => {
      patchSession((current) => {
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const medicalState = markPhysioManualDone(
          ensurePhysioWeek(
            current.medicalState,
            current.players,
            current.season,
            current.week,
            level,
          ),
          playerId,
          success,
        );
        return {
          ...current,
          medicalState,
          players: current.players.map((player) => {
            if (player.id !== playerId) return player;
            return success ? reduceInjuryWeeks(player, 0.2) : extendInjuryWeeks(player, 1);
          }),
        };
      });
      flashNotice(
        t(success ? "medical.physio.manualDone" : "medical.physio.manualFail"),
        success ? "ok" : "warn",
      );
    },
    [flashNotice, patchSession],
  );

  const handleRehabMinigameComplete = useCallback(
    (playerId: string, success: boolean) => {
      patchSession((current) => {
        const applied = applyRehabMinigameBonus(
          current.medicalState,
          current.players,
          current.season,
          current.week,
          playerId,
          success,
        );
        return {
          ...current,
          medicalState: applied.medicalState,
          players: applied.players,
        };
      });
      flashNotice(
        success ? t("medical.rehab.success") : t("medical.rehab.fail"),
        success ? "ok" : "warn",
      );
    },
    [flashNotice, patchSession],
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
  const openDecisionCount = postfachOpenCount(
    youthInbox,
    players,
    youthCamps,
    scoutBoard,
    orthopedistHire,
    Boolean(medicalStaff.orthopedist),
  );

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
        : trainingAutoNext && screen === "training"
          ? t("training.autoNext.buttonLabel")
          : isTrainingNextActive(session) &&
              !careerMatchSetup &&
              !hasInboxBlockerForNext(session, youthInbox, players)
            ? t("training.next.header", {
                remaining: String(trainingWeekSlotsRemaining(session)),
              })
            : t("shell.next");

  const nextHeaderButtonTitle =
    trainingAutoNext && screen === "training" && !(careerMatchSetup && careerMatchUiVisible)
      ? t("training.autoNext.active")
      : undefined;

  const navActions: HubNavActions = {
    week,
    weekday,
    simulating,
    openDecisionCount,
    onNext: () => void handleNext(undefined),
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
    nextHeaderButtonLabel,
    nextHeaderButtonTitle,
  };

  const applyCloudSave = useCallback(
    (cloudSave: SaveGame, slot: number) => {
      setActiveSlot(slot);
      setActiveSlotState(slot);
      const normalized = normalizeSave(cloudSave);
      writeLocalSave(slot, normalized);
      setSave(normalized);
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
      flashNotice(t("save.cloud.pullOk"), "ok");
    },
    [flashNotice, setActiveSlot],
  );

  const saveManagerOverlay = saveManagerOpen ? (
    <SaveManagerModal
      activeSlot={activeSlot}
      currentSave={save}
      onClose={() => setSaveManagerOpen(false)}
      onLoadSlot={loadSaveSlot}
      onNewGameInSlot={newGameInSlot}
      onApplyCloudSave={applyCloudSave}
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
        finalizeCampDebutReveal();
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
      <>
        <AppChrome
          screen="hub"
          week={week}
          weekday={weekday}
          trainingPlan={trainingPlan}
          storyState={storyState}
          stadium={stadium}
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
          medicalAttentionCount={medicalAttentionCount}
          cash={finances.cash}
          boardCashFloor={boardCashFloor(board)}
          weeklyWageBill={weeklyWageBill(players, session.clubId)}
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
          masterSeed={masterSeed}
          league={league}
          worldClubs={world.clubs}
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
          stadium={stadium}
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
          stadium={stadium}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          clubLogoSrc={shellClub.logoSrc}
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
        stadium={stadium}
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
        medicalAttentionCount={medicalAttentionCount}
        cash={finances.cash}
        boardCashFloor={boardCashFloor(board)}
        weeklyWageBill={weeklyWageBill(players, session.clubId)}
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
          onOpenScouting={(tab) => {
            setScoutingInitialTab(tab === "map" ? "map" : null);
            setScreen("scouting");
          }}
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
          transferState={transferState}
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
          orthopedistHire={orthopedistHire}
          hasOrthopedist={Boolean(medicalStaff.orthopedist)}
          onHireOrthopedist={handleHireOrthopedist}
          scoutBoard={scoutBoard}
          onDismissScoutJob={handleDismissScoutJob}
          onOpenScoutingNetwork={() => {
            setScoutingInitialTab("map");
            setScreen("scouting");
          }}
          onOpenScoutingHits={() => {
            setScoutingInitialTab("hits");
            setScreen("scouting");
          }}
          onApplyOpponentScoutPlan={handleApplyOpponentScoutPlan}
          clubEvents={clubEvents}
          kickerEdition={session.kickerEdition ?? null}
          kickerEditionArchive={session.kickerEditionArchive}
          transferHistory={session.transferState.history ?? []}
          rivalPlayers={session.rivalPlayers}
          worldClubs={session.world.clubs}
          treterSession={session}
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
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          onSelectPlayer={setProfileId}
          focusIndividualPlayerId={trainingFocusPlayerId}
          onClearIndividualFocus={() => setTrainingFocusPlayerId(null)}
          trainingUnlocks={{
            hasTrainingHall: precinctHasTrainingHall(stadium.precinct),
            trainingPitchLevel: precinctTrainingPitchLevel(stadium.precinct),
            medicalCenterLevel: precinctMedicalCenterLevel(stadium.precinct),
          }}
          injuryRiskFactor={injuryRiskFactor}
          trainingUnitsCompleted={trainingUnitsCompleted}
          trainingUnitOutcomes={trainingUnitOutcomes}
          useTrainingUnitProgress={usesTrainingNextNexus(storyState)}
          trainingPlanPresets={trainingPlanPresets}
          onTrainingPlanPresetsChange={handleTrainingPlanPresetsChange}
          onTrainingPresetNotice={flashNotice}
          trainingAutoNext={trainingAutoNext}
          onStopTrainingAutoNext={() => setTrainingAutoNext(false)}
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
          cash={finances.cash}
          clubId={session.clubId}
          trainingPlan={trainingPlan}
          individualPrograms={individualPrograms}
          academyFacility={academyFacility}
          youthCamps={youthCamps}
          masterSeed={session.masterSeed}
          onSelectPlayer={setProfileId}
          campusTab={campusTab}
          onCampusTabChange={setCampusTab}
          youthSort={campusYouthSort}
          onYouthSortChange={setCampusYouthSort}
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
          cash={finances.cash}
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
          onHireScout={handleHireScout}
          onFireScout={handleFireScout}
          shortlistIds={transferState.shortlist}
          onToggleShortlist={handleToggleShortlist}
          initialTab={scoutingInitialTab}
          onInitialTabApplied={() => setScoutingInitialTab(null)}
          onScoutMapDetailChange={handleScoutMapDetailChange}
          opponentLabel={prepareCareerMatch(session)?.opponentShortName}
          matchSetup={prepareCareerMatch(session)}
          careerPhase={storyState.career_phase}
        />
      ) : null}
      {screen === "transfers" ? (
        <TransfersScreen
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          history={transferState.history}
          worldClubs={world.clubs}
          onSelectPlayer={setProfileId}
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
          onHireCoach={handleHireCoach}
          assistantName={storyState.cast.assistant_name}
          assistantDelegation={assistantDelegation}
          onAssistantDelegationChange={handleAssistantDelegationChange}
          onAssignMentor={handleAssignMentor}
          onClearMentor={handleClearMentor}
          onOpenMedical={() => setScreen("medical")}
          onSelectPlayer={setProfileId}
        />
      ) : null}
      {screen === "medical" ? (
        <MedicalCenterScreen
          players={players}
          clubId={session.clubId}
          stadium={stadium}
          season={season}
          week={week}
          cash={finances.cash}
          masterSeed={masterSeed}
          medicalStaff={medicalStaff}
          medicalState={medicalState}
          orthopedistHire={orthopedistHire}
          trainingIntensity={trainingIntensity}
          injuryRiskFactor={injuryRiskFactor}
          onSelectPlayer={setProfileId}
          onHireDoctor={handleHireMedicalDoctor}
          onHirePhysio={handleHireMedicalPhysio}
          onHireOrthopedist={handleHireOrthopedist}
          onRehabMinigameComplete={handleRehabMinigameComplete}
          onDoctorExamComplete={handleDoctorExamComplete}
          onSurgery={handleSurgery}
          onPhysioManual={handlePhysioManual}
        />
      ) : null}
      {screen === "club-events" ? (
        <ClubEventsScreen events={clubEvents} />
      ) : null}
      {screen === "merchandising" ? (
        <MerchandisingScreen
          stadium={stadium}
          players={players}
          clubId={session.clubId}
          finances={finances}
          season={season}
          week={week}
          weekday={weekday}
          masterSeed={masterSeed}
          isHomeMatchWeek={stadiumIsHomeMatchWeek}
          onMerchandisingChange={handleMerchandisingChange}
          onRequestBulkPurchase={handleMerchBulkPurchase}
          onRequestOnDemand={handleMerchOnDemand}
          onStartMerchSale={handleMerchSaleStart}
        />
      ) : null}
      {screen === "finances" ? (
        <FinancesScreen
          finances={finances}
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          masterSeed={masterSeed}
          stadium={stadium}
          league={league}
          coachingStaff={coachingStaff}
          scoutNetwork={scoutNetwork}
          boardCashFloor={boardCashFloor(board)}
          boardPressure={board.pressure}
          financing={financing}
          onDrawBankLoan={handleDrawBankLoan}
          onOpenStadium={() => setScreen("stadium")}
          onStadiumChange={(next) =>
            patchSession((current) => ({
              ...current,
              stadium: normalizeClubStadium(next),
            }))
          }
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
          week={week}
          isHomeMatchWeek={stadiumIsHomeMatchWeek}
          opponentFanbase={stadiumOpponentFanbase}
          onStadiumChange={(next) =>
            patchSession((current) => ({
              ...current,
              stadium: normalizeClubStadium(next),
            }))
          }
          onStartBlockExpansion={handleStartBlockExpansion}
          onPurchaseUpgrade={handlePurchaseStadiumUpgrade}
          onPlacePrecinct={handlePlacePrecinct}
          onUpgradePrecinct={handleUpgradePrecinct}
          onBuyParcel={handleBuyParcel}
          onPlaceStreet={handlePlaceStreet}
          onExpandPrecinct={handleExpandPrecinct}
          onShrinkPrecinctToMin={handleShrinkPrecinctToMin}
          onRemovePrecinctPatch={handleRemovePrecinctPatch}
          onRemoveStreet={handleRemoveStreet}
          precinctSeasonWeek={week}
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
          onFastForwardToMonth={handleFastForwardToMonth}
          fastForwardBusy={simulating}
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
      {campDebutOverlay}
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
  nextHeaderButtonLabel?: string;
  nextHeaderButtonTitle?: string;
}

function AppChrome({
  week,
  weekday,
  trainingPlan,
  storyState,
  stadium,
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
  medicalAttentionCount = 0,
  cash = 0,
  boardCashFloor = 0,
  weeklyWageBill = 0,
}: {
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  storyState: StoryState;
  stadium: ClubStadium;
  medicalAttentionCount?: number;
  cash?: number;
  boardCashFloor?: number;
  weeklyWageBill?: number;
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
        stadium={stadium}
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
        medicalAttentionCount={medicalAttentionCount}
        cash={cash}
        boardCashFloor={boardCashFloor}
        weeklyWageBill={weeklyWageBill}
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
  stadium,
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
  medicalAttentionCount = 0,
  cash = 0,
  boardCashFloor = 0,
  weeklyWageBill = 0,
}: {
  screen: Screen;
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  storyState: StoryState;
  stadium: ClubStadium;
  medicalAttentionCount?: number;
  cash?: number;
  boardCashFloor?: number;
  weeklyWageBill?: number;
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
  const showMerchStockoutWarn = hasMerchStockout(stadium);
  const showMedicalWarn = medicalAttentionCount > 0;
  const runwayWeeks = weeksOfWages(cash, weeklyWageBill);
  const showCashWarn =
    (boardCashFloor > 0 && cash < boardCashFloor) ||
    (weeklyWageBill > 0 && runwayWeeks != null && runwayWeeks < 4);
  const cashChipWarn =
    boardCashFloor > 0 && cash < boardCashFloor
      ? true
      : weeklyWageBill > 0 && runwayWeeks != null && runwayWeeks < 4;
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
      { screen: "postfach" as const, labelKey: "shell.nav.postfach" },
      { screen: "squad" as const, labelKey: "shell.nav.squad" },
      { screen: "training" as const, labelKey: "shell.nav.training" },
      { screen: "medical" as const, labelKey: "shell.nav.medical" },
      { screen: "campus" as const, labelKey: "shell.nav.campus" },
      { screen: "scouting" as const, labelKey: "shell.nav.scouting" },
      { screen: "transfers" as const, labelKey: "shell.nav.transfers" },
      { screen: "calendar" as const, labelKey: "shell.nav.calendar" },
      { screen: "leagues" as const, labelKey: "shell.nav.leagues" },
      { screen: "finances" as const, labelKey: "shell.nav.finances" },
      { screen: "merchandising" as const, labelKey: "shell.nav.merchandising" },
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
        <div className="app-nav-trailing-cluster">
          {showTrainingPlanWarn ||
          showMerchStockoutWarn ||
          showMedicalWarn ||
          showCashWarn ? (
            <div className="app-nav-status-wrap">
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
              {showMerchStockoutWarn ? (
                <button
                  type="button"
                  className="app-nav-training-warn"
                  onClick={() => onNavigate("merchandising")}
                  aria-label={tr("shell.merch.stockout")}
                  title={tr("shell.merch.stockout")}
                >
                  <Package size={18} strokeWidth={2.35} aria-hidden />
                </button>
              ) : null}
              {showMedicalWarn ? (
                <button
                  type="button"
                  className="app-nav-training-warn"
                  onClick={() => onNavigate("medical")}
                  aria-label={tr("shell.medical.attention")}
                  title={tr("shell.medical.attention")}
                >
                  <HeartPulse size={18} strokeWidth={2.35} aria-hidden />
                </button>
              ) : null}
              {showCashWarn ? (
                <button
                  type="button"
                  className="app-nav-training-warn"
                  onClick={() => onNavigate("finances")}
                  aria-label={tr("shell.cash.warn")}
                  title={tr("shell.cash.warn")}
                >
                  <TriangleAlert size={18} strokeWidth={2.35} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
          <CashChip
            cash={cash}
            compact
            warn={cashChipWarn}
            onClick={() => onNavigate("finances")}
          />
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
                      <span className="pipeline-menu-item-label">{tr(item.labelKey)}</span>
                      {item.screen === "postfach" && hubActions.openDecisionCount > 0 ? (
                        <span className="pipeline-menu-badge" aria-label={tr("hub.inbox.decisions")}>
                          {hubActions.openDecisionCount}
                        </span>
                      ) : null}
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
            hubActions.nextHeaderButtonTitle ??
            (hubActions.primaryAction
              ? hubActions.primaryAction.label
              : hubActions.nextHeaderTitle ?? tr("shell.smartSkip"))
          }
        >
          <span className="app-nav-next-mobile">
            {hubActions.simulating && !hubActions.primaryAction
              ? "…"
              : hubActions.primaryAction?.label ??
                hubActions.nextHeaderButtonLabel ??
                tr("shell.next")}
          </span>
          <span className="app-nav-next-desktop">
            {hubActions.simulating && !hubActions.primaryAction
              ? "…"
              : hubActions.primaryAction?.label ??
                hubActions.nextHeaderButtonLabel ??
                tr("shell.next")}
            {hubActions.openDecisionCount > 0 && !hubActions.primaryAction ? (
              <span className="app-nav-next-badge" aria-label={tr("hub.inbox.decisions")}>
                {hubActions.openDecisionCount}
              </span>
            ) : null}
          </span>
        </button>
        </div>
      </div>
    </nav>
  );
}
