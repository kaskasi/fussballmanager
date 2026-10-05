import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IndividualProgram } from "./development/individual-training.ts";
import { assignIndividualProgram } from "./development/individual-training.ts";
import { processTransferBreakout } from "./development/breakouts.ts";
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
  getBoardTarget,
  listBoardTargets,
  removeScoutAssignment,
  toggleScoutAssignment,
} from "./scouting/scout-board.ts";
import { ClubCrest } from "./ui/components/ClubCrest.tsx";
import { prepareCareerMatch, type CareerMatchSetup } from "./sim/career-match-setup.ts";
import type { WatchedPlayerMatch } from "./sim/watched-player-match.ts";
import { MONDAY, resolveSmartSkip } from "./sim/day-calendar.ts";
import { formatSeasonLabel } from "./sim/season-label.ts";
import { simulateGameWeek } from "./sim/week-pipeline.ts";
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
import {
  acceptCounterOffer,
  activeNegotiation,
  completePurchase,
  sellerAskingPrice,
  startNegotiation,
  submitNegotiationRound,
  toggleShortlist,
} from "./transfers/negotiations.ts";
import { TransferNegotiationModal } from "./ui/components/TransferNegotiationModal.tsx";
import { SpendConfirmSheet } from "./ui/components/SpendConfirmSheet.tsx";
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
import type { MatchLineupState } from "./match/lineup-board.ts";
import { saveTacticsPreset, type TacticsPresetId } from "./match/tactics-presets.ts";
import { JobOffersModal } from "./ui/components/JobOffersModal.tsx";
import {
  DEFAULT_FANBASE,
  STADIUM_BASE_BLOCKS,
  normalizeClubStadium,
  stadiumTotalCapacity,
} from "./stadium/club-stadium.ts";
import { clubDisplayName, clubShortLabel } from "./sim/league-divisions.ts";
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
import { DecisionInboxModal } from "./ui/components/DecisionInbox.tsx";
import { SaveManagerModal } from "./ui/components/SaveManagerModal.tsx";
import { NoticeToast, SaveToast } from "./ui/components/SaveToast.tsx";
import {
  cannotOpenPurchaseReason,
  cannotPayTransferFeeReason,
} from "./transfers/purchase-block.ts";
import { TransferWindowAmbience } from "./ui/components/TransferWindowAmbience.tsx";
import { YouthCampus } from "./ui/screens/YouthCampus";
import { CalendarScreen } from "./ui/screens/CalendarScreen.tsx";
import { canBuyAcademyUpgrade, ACADEMY_FACILITIES } from "./youth/academy.ts";
import {
  buyYouthCamp,
  campNationById,
  canBuyYouthCamp,
  pullCampPlayerToHq,
  setCampStaffed,
} from "./youth/satellite-camps.ts";
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
  | "calendar";

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
    setInboxOpen: (value: boolean) => void;
    setProfileFeedback: (value: string | null) => void;
    setCareerMatchSetup: (value: CareerMatchSetup | null) => void;
    setMatchNavAction: (value: NavPrimaryAction | null) => void;
    setMarketFilters: (value: MarketFilters) => void;
    setMarketSort: (value: MarketSort) => void;
    setScreen: (value: Screen) => void;
  },
) {
  setters.setProfileId(null);
  setters.setForeignPlayerId(null);
  setters.setInboxOpen(false);
  setters.setProfileFeedback(null);
  setters.setCareerMatchSetup(null);
  setters.setMatchNavAction(null);
  setters.setMarketFilters(DEFAULT_MARKET_FILTERS);
  setters.setMarketSort(DEFAULT_MARKET_SORT);
  setters.setScreen("hub");
}

export default function App() {
  useLocale();
  const [screen, setScreen] = useState<Screen>("hub");
  const [activeSlot, setActiveSlotState] = useState(() => getActiveSlot());
  const [save, setSave] = useState<SaveGame>(() => bootstrapSave(getActiveSlot()));
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [negotiationPlayerId, setNegotiationPlayerId] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItemId, setInboxItemId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [careerMatchSetup, setCareerMatchSetup] = useState<CareerMatchSetup | null>(null);
  const [matchNavAction, setMatchNavAction] = useState<NavPrimaryAction | null>(null);
  const [matchSkipToReport, setMatchSkipToReport] = useState<(() => void) | null>(null);
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [marketSort, setMarketSort] = useState<MarketSort>(DEFAULT_MARKET_SORT);
  const [trainingFocusPlayerId, setTrainingFocusPlayerId] = useState<string | null>(null);
  const [clubProfileId, setClubProfileId] = useState<TeamId | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() =>
    loadAccessibilityPreferences(),
  );
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [pendingWatchedMatch, setPendingWatchedMatch] = useState<WatchedPlayerMatch | null>(null);
  const [pendingSpend, setPendingSpend] = useState<{
    title: string;
    cost: number;
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

  const session = sessionFromSave(save);
  const {
    season,
    week,
    weekday,
    players,
    trainingPlan,
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
  } = session;
  const shellClub = useMemo(() => {
    const teamId = league.player_club_id;
    const table = standings(league.club_ids, league.results);
    const placeIndex = table.findIndex((row) => row.teamId === teamId);
    return {
      name: clubDisplayName(teamId, world.clubs),
      initials: clubShortLabel(teamId, world.clubs),
      leaguePlace: placeIndex >= 0 ? placeIndex + 1 : null,
    };
  }, [world.clubs, league.player_club_id, league.club_ids, league.results]);

  const scoutCapacity = scoutNetworkCapacity(scoutNetwork);

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

  const requestClubSpend = useCallback(
    (
      cost: number,
      title: string,
      apply: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>,
    ) => {
      const wageBill = weeklyWageBill(players, session.clubId);
      if (needsSpendConfirm(cost, wageBill)) {
        setPendingSpend({ title, cost, apply });
        return;
      }
      patchSession(apply);
    },
    [patchSession, players, session.clubId],
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
      let nextSession = {
        ...result.session,
        weekday: MONDAY,
        matchPlayedThisWeek: false,
        youthInbox: deliverDailyInbox(result.session.youthInbox, result.session.players),
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
          setCareerMatchSetup(null);
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
      setCareerMatchSetup(null);
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

  const openInbox = useCallback(
    (itemId?: string) => {
      const pending = pendingInboxItems(youthInbox, players);
      if (!itemId && pending.length === 0) return;
      if (itemId && !pending.some((item) => item.id === itemId)) return;
      setInboxItemId(itemId ?? null);
      setInboxOpen(true);
    },
    [youthInbox, players],
  );

  /** Post-Inbox lives on the Hub — leave overlays/other screens so the modal can mount. */
  const openHubInbox = useCallback(
    (itemId?: string) => {
      const pending = pendingInboxItems(youthInbox, players);
      const targetId = itemId ?? pending[0]?.id ?? null;
      if (!targetId && pending.length === 0) return;
      if (targetId && !pending.some((item) => item.id === targetId)) return;
      setProfileId(null);
      setForeignPlayerId(null);
      setProfileFeedback(null);
      setScreen("hub");
      setInboxItemId(targetId);
      setInboxOpen(true);
    },
    [youthInbox, players],
  );

  const handleNext = useCallback(() => {
    if (simulating) return;
    const hasInbox = pendingInboxItems(youthInbox, players).length > 0;
    const skip = resolveSmartSkip(session, hasInbox);

    if (skip.action === "inbox") {
      const inboxVisibleHere =
        (screen === "hub" || screen === "squad") && !profileId && !foreignPlayerId;
      if (inboxVisibleHere) {
        openInbox();
      } else {
        openHubInbox();
      }
      return;
    }

    const inboxAfterDays =
      skip.daysAdvanced > 0
        ? deliverInboxForDays(session.youthInbox, skip.daysAdvanced, session.players)
        : session.youthInbox;
    const sessionAtTarget = { ...session, weekday: skip.weekday, youthInbox: inboxAfterDays };

    if (skip.daysAdvanced > 0) {
      patchSession((current) => ({
        ...current,
        weekday: skip.weekday,
        youthInbox: deliverInboxForDays(current.youthInbox, skip.daysAdvanced, current.players),
      }));
    }

    if (skip.action === "match") {
      const setup = prepareCareerMatch(sessionAtTarget);
      if (setup) {
        setCareerMatchSetup(setup);
        setScreen("hub");
      }
      return;
    }

    if (skip.action === "simulate_week") {
      void simulateWeek();
    }
  }, [
    foreignPlayerId,
    openHubInbox,
    openInbox,
    patchSession,
    profileId,
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
          setInboxOpen(false);
          setInboxItemId(null);
        }
        let next = {
          ...current,
          players: result.players,
          youthInbox: result.inbox,
        };
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
        scoutBoard: assignScout(
          current.scoutBoard,
          playerId,
          scoutNetworkCapacity(current.scoutNetwork),
        ),
      }));
    },
    [patchSession],
  );

  const handleHireScout = useCallback(
    (scout: HiredScout) => {
      patchSession((current) => {
        if (current.finances.cash < scout.wage_weekly * 4) {
          return sessionWithEvent(
            current,
            "finance",
            `Zu wenig Cash für Scout ${scout.name}.`,
          );
        }
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork: hireScout(current.scoutNetwork, scout),
          },
          "info",
          `Scout eingestellt: ${scout.name}.`,
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
          return sessionWithEvent(current, "info", "Mindestens ein Scout muss im Netzwerk bleiben.");
        }
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork: fireScout(current.scoutNetwork, scoutId),
          },
          "info",
          `${scout.name} verlässt das Scout-Netzwerk.`,
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
          region: marketFilters.query,
          query: marketFilters.query,
        },
      );
      return {
        ...current,
        scoutBoard: addScoutAssignment(current.scoutBoard, assignment),
      };
    });
  }, [marketFilters, patchSession]);

  const handleRemoveScoutAssignment = useCallback(
    (assignmentId: string) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: removeScoutAssignment(current.scoutBoard, assignmentId),
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
          `Neuer Job bei ${offer?.clubName ?? clubId} — Saisonziele gesetzt.`,
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
      requestClubSpend(check.cost, def ? `${def.icon} ${def.name}` : "Tribünen-Ausbau", (current) => {
        const result = purchaseStadiumUpgrade(
          current.stadium,
          current.finances,
          upgradeId,
          STADIUM_BASE_BLOCKS,
          current.week,
        );
        if (!result.ok) return current;
        return {
          ...current,
          stadium: normalizeClubStadium(result.stadium),
          finances: result.finances,
        };
      });
    },
    [finances, requestClubSpend, stadium],
  );

  const handlePlacePrecinct = useCallback(
    (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const cost = precinctPlacementCost(precinct, building, from);
      if (cost > finances.cash) return;
      const def = PRECINCT_BUILDINGS.find((entry) => entry.id === building);
      requestClubSpend(cost, def ? `${def.icon} ${def.label}` : "Gelände", (current) => {
        const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
        const actualCost = precinctPlacementCost(currentPrecinct, building, from);
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
      });
    },
    [finances.cash, requestClubSpend, stadium.precinct],
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
          return {
            ...current,
            youthCamps: buyYouthCamp(current.youthCamps, nationId, current.season),
            finances: spendClubCash(current.finances, next.cost, current.week),
          };
        },
      );
    },
    [finances.cash, requestClubSpend, youthCamps],
  );

  const handleToggleCampStaff = useCallback(
    (nationId: string, staffed: boolean) => {
      patchSession((current) => ({
        ...current,
        youthCamps: setCampStaffed(current.youthCamps, nationId, staffed),
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
      requestClubSpend(check.cost, def ? `${def.icon} ${def.label} Ausbau` : "Gelände-Ausbau", (current) => {
        const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
        const nextCheck = canUpgradePrecinctBuilding(currentPrecinct, building, current.finances.cash);
        if (!nextCheck.allowed) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({
            ...current.stadium,
            precinct: upgradePrecinctBuilding(currentPrecinct, building),
          }),
          finances: spendClubCash(current.finances, nextCheck.cost, current.week),
        };
      });
    },
    [finances.cash, requestClubSpend, stadium.precinct],
  );

  const handleBuyParcel = useCallback(() => {
    const precinct = stadium.precinct ?? emptyPrecinct();
    const check = canBuyPrecinctExpansion(precinct, finances.cash);
    if (!check.allowed) return;
    requestClubSpend(check.cost, "🗺️ Gelände-Erweiterung", (current) => {
      const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
      const nextCheck = canBuyPrecinctExpansion(currentPrecinct, current.finances.cash);
      if (!nextCheck.allowed) return current;
      return {
        ...current,
        stadium: normalizeClubStadium({
          ...current.stadium,
          precinct: buyPrecinctExpansion(currentPrecinct),
        }),
        finances: spendClubCash(current.finances, nextCheck.cost, current.week),
      };
    });
  }, [finances.cash, requestClubSpend, stadium.precinct]);

  const handlePlaceStreet = useCallback(
    (cells: Array<{ x: number; y: number }>) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const result = placeStreetRun(precinct, cells, current.finances.cash);
        if (result.spent <= 0) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({
            ...current.stadium,
            precinct: result.state,
          }),
          finances: spendClubCash(current.finances, result.spent, current.week),
        };
      });
    },
    [patchSession],
  );

  const handleExpandPrecinct = useCallback(
    (patchId: string, edge: PrecinctEdge, delta: 1 | -1 = 1) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const check = canNudgePrecinctPatch(precinct, patchId, edge, finances.cash, delta);
      if (!check.allowed) return;
      requestClubSpend(check.cost, "🗺️ Gelände wachsen", (current) => {
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
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
          finances:
            nextCheck.cost === 0
              ? current.finances
              : spendClubCash(current.finances, nextCheck.cost, current.week),
        };
      });
    },
    [finances.cash, requestClubSpend, stadium.precinct],
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
            eligibility.reason ?? "Verkauf nicht möglich.",
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
            "Kein Liga-Verein zahlt den Wunschpreis — im nächsten Fenster erneut versuchen.",
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
          `Abgang ${formatPlayerName(player)} zu ${loanClubName(buyerClubId)} für ${formatClubCash(deal.fee)}.`,
        );
        for (const narrative of shifted.narratives) {
          next = sessionWithEvent(next, "profile", `💡 ${narrative.narrative}`);
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
          return sessionWithEvent(current, "transfer", eligibility.reason ?? "Vorvertrag nicht möglich.");
        }

        const offer = preContractOffer(target.player, current.season, current.week);
        if (!offer || !canAffordTransfer(current.finances, offer.signingBonus)) {
          return sessionWithEvent(
            current,
            "finance",
            `Transfer-Budget zu niedrig (Signaturbonus ca. ${formatClubCash(offer?.signingBonus ?? 0)}).`,
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
              ? `${formatPlayerName(target.player)} wählt ${loanClubName(deal.winnerClubId)}.`
              : "Vorvertrag fehlgeschlagen.",
          );
        }

        return sessionWithEvent(
          {
            ...current,
            transferState: deal.state,
            finances: applyTransferFee(current.finances, deal.pending.signing_bonus, current.week),
          },
          "transfer",
          `Vorvertrag mit ${formatPlayerName(target.player)} — wirksam ${formatSeasonLabel(deal.pending.effective_season)}.`,
        );
      });
      setForeignPlayerId(null);
    },
    [patchSession],
  );

  const finalizePurchase = useCallback(
    (playerId: string, fee: number) => {
      let blocked: string | null = null;
      patchSession((current) => {
        const target = getBoardTarget(current.scoutBoard, playerId, current.rivalPlayers);
        const openReason = cannotOpenPurchaseReason(current.week, Boolean(target));
        if (openReason) {
          blocked = openReason;
          return sessionWithEvent(current, "transfer", openReason);
        }
        const payReason = cannotPayTransferFeeReason(current.finances, fee);
        if (payReason) {
          blocked = payReason;
          return sessionWithEvent(current, "finance", payReason);
        }
        if (!target) return current;

        const bought = completePurchase(target.player, current.clubId, current.season);
        const shifted = processTransferBreakout(bought, {
          masterSeed: current.masterSeed,
          worldEventId: `purchase_${current.season}_${current.week}_${playerId}_${current.clubId}`,
          week: current.week,
          previousMorale: target.player.state.morale,
          matchFitPoor: false,
        });
        const finalized = shifted.player;
        const targets = { ...current.scoutBoard.targets };
        delete targets[playerId];
        const purchaseRecord = createPurchaseRecord(
          finalized,
          fee,
          current.season,
          current.week,
          target.player.club_id ?? "cl_rival_pool",
          current.clubId,
        );
        let next = sessionWithEvent(
          {
            ...current,
            players: [...current.players, finalized],
            rivalPlayers: current.rivalPlayers.filter((player) => player.id !== playerId),
            transferState: appendTransferRecord(current.transferState, purchaseRecord),
            scoutBoard: { ...current.scoutBoard, targets },
            finances: applyTransferFee(current.finances, fee, current.week),
          },
          "transfer",
          `Zugang ${formatPlayerName(finalized)} für ${formatClubCash(fee)}.`,
        );
        for (const narrative of shifted.narratives) {
          next = sessionWithEvent(next, "profile", `💡 ${narrative.narrative}`);
        }
        return next;
      });
      if (blocked) {
        flashNotice(blocked);
        return;
      }
      setForeignPlayerId(null);
      setNegotiationPlayerId(null);
      setNegotiationMessage(null);
    },
    [flashNotice, patchSession],
  );

  const handleOpenNegotiation = useCallback(
    (playerId: string) => {
      let started = false;
      let blocked: string | null = null;
      patchSession((current) => {
        const target = getBoardTarget(current.scoutBoard, playerId, current.rivalPlayers);
        const reason = cannotOpenPurchaseReason(current.week, Boolean(target));
        if (reason) {
          blocked = reason;
          return sessionWithEvent(current, "transfer", reason);
        }
        if (!target) return current;
        const deal = startNegotiation(
          current.transferState,
          target.player,
          target.player.club_id ?? "cl_rival_pool",
          current.season,
          current.week,
        );
        started = true;
        return { ...current, transferState: deal.state };
      });
      if (started) {
        setNegotiationPlayerId(playerId);
        setNegotiationMessage(null);
        return;
      }
      flashNotice(blocked ?? t("transfer.purchase.negotiationFailed"));
    },
    [flashNotice, patchSession],
  );

  const handleNegotiationOffer = useCallback(
    (fee: number) => {
      if (!negotiationPlayerId) return;
      const payReason = cannotPayTransferFeeReason(finances, fee);
      if (payReason) {
        flashNotice(payReason);
        setNegotiationMessage(payReason);
        return;
      }
      let accepted = false;
      let missingTarget = false;
      patchSession((current) => {
        const target = getBoardTarget(current.scoutBoard, negotiationPlayerId, current.rivalPlayers);
        if (!target) {
          missingTarget = true;
          return current;
        }
        const round = submitNegotiationRound(current.transferState, negotiationPlayerId, fee);
        setNegotiationMessage(round.message);
        accepted = round.accepted;
        if (!round.accepted && round.negotiation.status !== "active") {
          setNegotiationPlayerId(null);
          flashNotice(round.message);
        }
        if (round.moralePenalty) {
          return sessionWithEvent(
            { ...current, transferState: round.state },
            "transfer",
            `Verhandlung gescheitert — Spieler-Moral −${round.moralePenalty}.`,
          );
        }
        return { ...current, transferState: round.state };
      });
      if (missingTarget) {
        flashNotice(cannotOpenPurchaseReason(week, false) ?? t("transfer.purchase.generic"));
        return;
      }
      if (accepted) finalizePurchase(negotiationPlayerId, fee);
    },
    [finalizePurchase, finances, flashNotice, negotiationPlayerId, patchSession, week],
  );

  const handleAcceptCounter = useCallback(() => {
    if (!negotiationPlayerId) return;
    let acceptedFee: number | null = null;
    let failMessage: string | null = null;
    patchSession((current) => {
      const round = acceptCounterOffer(current.transferState, negotiationPlayerId);
      setNegotiationMessage(round.message);
      if (round.accepted && round.negotiation.counter_offer) {
        acceptedFee = round.negotiation.counter_offer;
      } else if (!round.accepted) {
        failMessage = round.message;
      }
      setNegotiationPlayerId(null);
      return { ...current, transferState: round.state };
    });
    if (failMessage) {
      flashNotice(failMessage);
      return;
    }
    if (acceptedFee === null) return;
    const payReason = cannotPayTransferFeeReason(finances, acceptedFee);
    if (payReason) {
      flashNotice(payReason);
      return;
    }
    finalizePurchase(negotiationPlayerId, acceptedFee);
  }, [finalizePurchase, finances, flashNotice, negotiationPlayerId, patchSession]);

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
            `Zu wenig Cash für ${coach.name} (min. ${formatClubCash(coach.wage_weekly * 2)}).`,
          );
        }
        const currentCoach = current.coachingStaff[coach.role];
        if (currentCoach && coach.quality <= currentCoach.quality) {
          return sessionWithEvent(current, "info", "Der Kandidat ist nicht besser als der aktuelle Trainer.");
        }
        return sessionWithEvent(
          {
            ...current,
            coachingStaff: hireCoach(current.coachingStaff, coach),
          },
          "info",
          `Neuer ${COACH_ROLE_LABELS[coach.role]}-Trainer: ${coach.name} (Q${coach.quality}).`,
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
      setInboxOpen,
      setProfileFeedback,
      setCareerMatchSetup,
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
        setInboxOpen,
        setProfileFeedback,
        setCareerMatchSetup,
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
      setInboxOpen,
      setProfileFeedback,
      setCareerMatchSetup,
      setMatchNavAction,
      setMarketFilters,
      setMarketSort,
      setScreen,
    });
  }, []);

  const jobOffers = listJobOffers(board.employer_club_id, season, league);
  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const foreignTarget = foreignPlayerId
    ? getBoardTarget(scoutBoard, foreignPlayerId, rivalPlayers)
    : null;

  useEffect(() => {
    if (!foreignPlayerId || foreignTarget) return;
    flashNotice(t("transfer.purchase.profileUnavailable"));
    setForeignPlayerId(null);
  }, [flashNotice, foreignPlayerId, foreignTarget]);
  const openDecisionCount = pendingInboxItems(youthInbox, players).length;

  const navActions: HubNavActions = {
    week,
    weekday,
    simulating,
    openDecisionCount,
    onNext: () => void handleNext(),
    onNewGame: resetGame,
    onOpenSaves: () => setSaveManagerOpen(true),
    primaryAction: careerMatchSetup ? matchNavAction : null,
    matchSkipToReport: careerMatchSetup ? matchSkipToReport : null,
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

  if (careerMatchSetup) {
    return (
      <>
        <AppChrome
          screen="hub"
          week={week}
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={setScreen}
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
          onRegisterSkipToReport={setMatchSkipToReport}
          broadcastStory={careerBroadcastStory}
          kasse={matchdayCashBreakdown(stadium, careerMatchSetup.isHome)}
          homeStadiumCapacity={stadiumTotalCapacity(stadium)}
          fanbaseMood={matchFanbaseMood}
          poorForm={matchPoorForm}
        />
        {saveManagerOverlay}
        {spendConfirmOverlay}
        {noticeOverlay}
      </>
    );
  }

  if (foreignTarget) {
    return (
      <>
        <AppChrome
          screen={screen}
          week={week}
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={setScreen}
          onCloseProfile={() => setForeignPlayerId(null)}
          onCampusNavigate={() => undefined}
          hubActions={navActions}
          accessibility={accessibility}
          onAccessibilityChange={setAccessibility}
        />
        <PlayerProfile
          player={foreignTarget.player}
          owned={false}
          scoutEstimate={foreignTarget.estimate}
          scouting={foreignTarget.assigned}
          week={week}
          season={season}
          transferWindowOpen={isTransferWindowOpen(week)}
          transferBudget={transferBudget(finances)}
          purchasePrice={sellerAskingPrice(foreignTarget.player, season)}
          shortlisted={transferState.shortlist.includes(foreignTarget.player.id)}
          onAssignScout={() => handleAssignScout(foreignTarget.player.id)}
          onToggleShortlist={() => handleToggleShortlist(foreignTarget.player.id)}
          onPurchase={() => handleOpenNegotiation(foreignTarget.player.id)}
          actionFeedback={profileFeedback}
          onTransferNotice={(message) => {
            flashNotice(message);
          }}
          preContractBonus={preContractOffer(foreignTarget.player, season, week)?.signingBonus}
          preContractBlockedReason={(() => {
            const eligibility = canSignPreContract(
              foreignTarget.player,
              session.clubId,
              season,
              week,
              transferState.pending_transfers ?? [],
            );
            if (!eligibility.allowed) return eligibility.reason ?? null;
            const offer = preContractOffer(foreignTarget.player, season, week);
            if (!offer) return "Kein Vertrag.";
            if (!canAffordTransfer(finances, offer.signingBonus)) {
              return `Signaturbonus ca. ${formatClubCash(offer.signingBonus)} — Budget zu niedrig.`;
            }
            return null;
          })()}
          onPreContract={() => handlePreContract(foreignTarget.player.id)}
        />
        {negotiationPlayerId && activeNegotiation(transferState, negotiationPlayerId) ? (
          <TransferNegotiationModal
            player={foreignTarget.player}
            negotiation={activeNegotiation(transferState, negotiationPlayerId)!}
            transferBudget={transferBudget(finances)}
            finances={finances}
            weeklyWageBill={weeklyWageBill(players, session.clubId)}
            boardCashFloor={boardCashFloor(board)}
            scoutIntelKnown={Boolean(foreignTarget.estimate)}
            message={negotiationMessage}
            onSubmitOffer={handleNegotiationOffer}
            onAcceptCounter={handleAcceptCounter}
            onWalkAway={() => {
              setNegotiationPlayerId(null);
              setNegotiationMessage(null);
            }}
          />
        ) : null}
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
          cash={finances.cash}
          clubName={shellClub.name}
          clubInitials={shellClub.initials}
          leaguePlace={shellClub.leaguePlace}
          onNavigate={setScreen}
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
        cash={finances.cash}
        clubName={shellClub.name}
        clubInitials={shellClub.initials}
        leaguePlace={shellClub.leaguePlace}
        onNavigate={setScreen}
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
          onOpenInbox={openInbox}
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
          onBack={() => setScreen("hub")}
          focusIndividualPlayerId={trainingFocusPlayerId}
          onClearIndividualFocus={() => setTrainingFocusPlayerId(null)}
          hasTrainingHall={precinctHasTrainingHall(stadium.precinct)}
          injuryRiskFactor={precinctInjuryRiskFactor(stadium.precinct)}
        />
      ) : null}
      {inboxOpen && pendingInboxItems(youthInbox, players).length > 0 ? (
        <DecisionInboxModal
          inbox={youthInbox}
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
          storyCast={session.storyState.cast}
          initialItemId={inboxItemId}
          onDecision={handleInboxDecision}
          onClose={() => {
            setInboxOpen(false);
            setInboxItemId(null);
          }}
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
          cash={finances.cash}
          onSelectPlayer={setProfileId}
          onOpenInbox={openInbox}
          onInboxDecision={handleInboxDecision}
          onBuyCamp={handleBuyYouthCamp}
          onToggleCampStaff={handleToggleCampStaff}
          onPullCampPlayer={handlePullCampPlayer}
        />
      ) : null}
      {screen === "scouting" ? (
        <ScoutingCenter
          targets={listBoardTargets(scoutBoard, rivalPlayers, world.clubs)}
          filters={marketFilters}
          onFiltersChange={setMarketFilters}
          sort={marketSort}
          onSortChange={setMarketSort}
          assignments={scoutBoard.assignments ?? []}
          onAddAssignment={handleAddScoutAssignment}
          onRemoveAssignment={handleRemoveScoutAssignment}
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
          onBack={() => setScreen("hub")}
          onSelectPlayer={setProfileId}
        />
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
        <CalendarScreen season={season} week={week} league={league} />
      ) : null}
      {clubProfileId && screen !== "leagues" ? (
        <ClubProfileModal
          teamId={clubProfileId}
          league={league}
          players={players}
          rivalPlayers={rivalPlayers}
          stadium={stadium}
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
  onNewGame: () => void;
  onOpenSaves: () => void;
  primaryAction?: NavPrimaryAction | null;
  matchSkipToReport?: (() => void) | null;
}

function AppChrome({
  week,
  cash,
  clubName,
  clubInitials,
  leaguePlace,
  screen,
  onNavigate,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
  accessibility,
  onAccessibilityChange,
  shellChrome = "card",
}: {
  week: number;
  cash: number;
  clubName: string;
  clubInitials: string;
  leaguePlace: number | null;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
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
        clubName={clubName}
        clubInitials={clubInitials}
        leaguePlace={leaguePlace}
        onNavigate={onNavigate}
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
  cash,
  clubName,
  clubInitials,
  leaguePlace,
  onNavigate,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
  accessibility,
  onAccessibilityChange,
  shellChrome = "card",
}: {
  screen: Screen;
  week: number;
  cash: number;
  clubName: string;
  clubInitials: string;
  leaguePlace: number | null;
  onNavigate: (screen: Screen) => void;
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

  const teamMenu: {
    screen: Screen;
    labelKey: string;
    labelSuffix?: string;
    onClick?: () => void;
  }[] = [
    { screen: "hub", labelKey: "shell.nav.pipeline" },
    { screen: "squad", labelKey: "shell.nav.squad" },
    { screen: "training", labelKey: "shell.nav.training" },
    { screen: "campus", labelKey: "shell.nav.campus" },
    { screen: "scouting", labelKey: "shell.nav.scouting" },
    { screen: "transfers", labelKey: "shell.nav.transfers" },
    { screen: "calendar", labelKey: "shell.nav.calendar" },
    { screen: "leagues", labelKey: "shell.nav.leagues" },
    { screen: "finances", labelKey: "shell.nav.finances" },
    { screen: "stadium", labelKey: "shell.nav.stadium" },
    { screen: "help", labelKey: "shell.nav.help" },
  ];

  return (
    <nav
      className={`app-nav club-shell-header ${shellChrome === "card" ? "club-shell-card-head" : "club-shell-grid"}`}
      aria-label={tr("shell.nav.areas")}
    >
      <div className="club-shell-identity">
        <ClubCrest initials={clubInitials} />
        <div className="club-shell-identity-text">
          <p className="club-shell-name">{clubName}</p>
        </div>
      </div>
      <div className="app-nav-center" aria-live="polite">
        <TransferWindowAmbience week={week} placement="header" />
      </div>
      <div className="app-nav-actions">
        <span className="app-nav-cash" aria-label="Kasse">
          {formatClubCash(cash)}
        </span>
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
                  {hubActions.matchSkipToReport ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="row-menu-item"
                      onClick={() => {
                        hubActions.matchSkipToReport?.();
                        setMenuOpen(false);
                      }}
                    >
                      Direkt zur Zusammenfassung
                    </button>
                  ) : null}
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
          onClick={hubActions.primaryAction?.onClick ?? hubActions.onNext}
          disabled={hubActions.primaryAction?.disabled ?? hubActions.simulating}
          title={
            hubActions.primaryAction?.title ??
            (hubActions.primaryAction ? hubActions.primaryAction.label : tr("shell.smartSkip"))
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
