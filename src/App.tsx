import { useCallback, useEffect, useRef, useState } from "react";
import type { TrainingSlot } from "./development/training-units.ts";
import { CareerMatch } from "./match/CareerMatch";
import { appendMatchdayClubEvents } from "./match/post-match-events.ts";
import { Matchday } from "./match/Matchday";
import {
  DEFAULT_CLUB_ID,
  newGameSession,
  saveFromSession,
  sessionFromSave,
} from "./persistence/game-session.ts";
import { loadLocalSave, removeLocalSave, writeLocalSave } from "./persistence/local-save.ts";
import { getActiveSlot, setActiveSlot } from "./persistence/save-slots.ts";
import type { SaveGame } from "./persistence/savegame-model.ts";
import {
  activeScoutCount,
  assignScout,
  getBoardTarget,
} from "./scouting/scout-board.ts";
import { WeekdayStrip } from "./ui/components/WeekdayStrip.tsx";
import { prepareCareerMatch, type CareerMatchSetup } from "./sim/career-match-setup.ts";
import { MONDAY, resolveSmartSkip } from "./sim/day-calendar.ts";
import { simulateGameWeek } from "./sim/week-pipeline.ts";
import { isTransferWindowOpen } from "./sim/transfer-windows.ts";
import {
  applyTransferFee,
  canAffordTransfer,
  formatClubCash,
  transferBudget,
} from "./economy/club-finances.ts";
import { formatPlayerName } from "./types/player-display.ts";
import {
  attemptPurchase,
  completePurchase,
  sellerAskingPrice,
  toggleShortlist,
} from "./transfers/negotiations.ts";
import {
  appendTransferRecord,
  createPurchaseRecord,
  loanOutMessage,
  loanReturnMessage,
} from "./transfers/transfer-history.ts";
import { recallLoanPlayer } from "./transfers/loans.ts";
import { FirstTeam } from "./ui/screens/FirstTeam.tsx";
import { FinancesScreen } from "./ui/screens/FinancesScreen.tsx";
import { StadiumScreen } from "./ui/screens/StadiumScreen.tsx";
import type { SandboxPlan } from "@fussballmanager/shared";
import { saveTacticsPreset, type TacticsPresetId } from "./match/tactics-presets.ts";
import { STADIUM_BASE_BLOCKS, normalizeClubStadium, stadiumTotalCapacity } from "./stadium/club-stadium.ts";
import { purchaseStadiumUpgrade } from "./stadium/stadium-upgrades.ts";
import { TransfersScreen } from "./ui/screens/TransfersScreen.tsx";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
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
import { TransferWindowAmbience } from "./ui/components/TransferWindowAmbience.tsx";
import { YouthCampus } from "./ui/screens/YouthCampus";
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
  pendingInboxItems,
  type DecisionAction,
} from "./youth/decision-inbox.ts";
import type { NavPrimaryAction } from "./ui/nav-primary-action.ts";

type Screen = "hub" | "campus" | "matchday" | "scouting" | "transfers" | "squad" | "finances" | "stadium";

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
    setCampusYearOpen: (value: boolean) => void;
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
  setters.setCampusYearOpen(false);
  setters.setInboxOpen(false);
  setters.setProfileFeedback(null);
  setters.setCareerMatchSetup(null);
  setters.setMatchNavAction(null);
  setters.setMarketFilters(DEFAULT_MARKET_FILTERS);
  setters.setMarketSort(DEFAULT_MARKET_SORT);
  setters.setScreen("hub");
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [activeSlot, setActiveSlotState] = useState(() => getActiveSlot());
  const [save, setSave] = useState<SaveGame>(() => bootstrapSave(getActiveSlot()));
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [campusYearOpen, setCampusYearOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItemId, setInboxItemId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [careerMatchSetup, setCareerMatchSetup] = useState<CareerMatchSetup | null>(null);
  const [matchNavAction, setMatchNavAction] = useState<NavPrimaryAction | null>(null);
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [marketSort, setMarketSort] = useState<MarketSort>(DEFAULT_MARKET_SORT);

  const session = sessionFromSave(save);
  const {
    season,
    week,
    weekday,
    players,
    trainingPlan,
    scoutBoard,
    youthInbox,
    league,
    transferState,
    finances,
    stadium,
    tacticsPresets,
    clubEvents,
  } = session;

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
  }, [activeSlot]);

  const finishWeekSimulation = useCallback(async () => {
    const snapshot = sessionFromSave(save);
    const result = await simulateGameWeek(snapshot);
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
  }, [activeSlot, save]);

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
    async (skipPlayback = false) => {
      if (simulating) return;
      if (skipPlayback) {
        setSimulating(true);
        try {
          await finishWeekSimulation();
          setCareerMatchSetup(null);
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

  const handleNext = useCallback(() => {
    if (simulating) return;
    const hasInbox = pendingInboxItems(youthInbox, players).length > 0;
    const skip = resolveSmartSkip(session, hasInbox);

    if (skip.action === "inbox") {
      openInbox();
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
  }, [openInbox, patchSession, session, simulating, simulateWeek, youthInbox]);

  const handleInboxDecision = useCallback(
    (itemId: string, action: DecisionAction) => {
      patchSession((current) => {
        const item = current.youthInbox.items.find((entry) => entry.id === itemId);
        const player = item ? current.players.find((entry) => entry.id === item.playerId) : null;
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
        const playerName = player ? formatPlayerName(player) : "Spieler";
        let next = {
          ...current,
          players: result.players,
          youthInbox: result.inbox,
        };
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

  const handleAssignScout = useCallback(
    (playerId: string) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: assignScout(current.scoutBoard, playerId),
      }));
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

  const handlePurchaseStadiumUpgrade = useCallback(
    (upgradeId: string) => {
      patchSession((current) => {
        const result = purchaseStadiumUpgrade(
          current.stadium,
          current.finances,
          upgradeId,
          STADIUM_BASE_BLOCKS,
        );
        if (!result.ok) return current;
        return {
          ...current,
          stadium: normalizeClubStadium(result.stadium),
          finances: result.finances,
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

  const handlePurchase = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const target = getBoardTarget(current.scoutBoard, playerId);
        if (!target || !isTransferWindowOpen(current.week)) return current;

        const deal = attemptPurchase(current.transferState, target.player, current.season, current.week);
        if (!deal.accepted) {
          return sessionWithEvent(
            { ...current, transferState: deal.state },
            "transfer",
            "Angebot abgelehnt — höheres Gebot nötig.",
          );
        }

        const fee = deal.fee ?? sellerAskingPrice(target.player, current.season);
        if (!canAffordTransfer(current.finances, fee)) {
          return sessionWithEvent(
            { ...current, transferState: deal.state },
            "finance",
            `Transfer-Budget zu niedrig (benötigt ca. ${formatClubCash(fee)}).`,
          );
        }

        const bought = completePurchase(target.player, DEFAULT_CLUB_ID, current.season);
        const targets = { ...current.scoutBoard.targets };
        delete targets[playerId];
        const purchaseRecord = createPurchaseRecord(
          bought,
          fee,
          current.season,
          current.week,
          target.player.club_id ?? "cl_rival_pool",
          DEFAULT_CLUB_ID,
        );
        return sessionWithEvent(
          {
            ...current,
            players: [...current.players, bought],
            transferState: appendTransferRecord(deal.state, purchaseRecord),
            scoutBoard: { targets },
            finances: applyTransferFee(current.finances, fee, current.week),
          },
          "transfer",
          `Zugang ${formatPlayerName(bought)} für ${formatClubCash(fee)}.`,
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

  const handleTrainingPlanChange = useCallback(
    (plan: TrainingSlot[]) => {
      patchSession((current) => ({ ...current, trainingPlan: plan }));
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
      setCampusYearOpen,
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
        setCampusYearOpen,
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
      setCampusYearOpen,
      setInboxOpen,
      setProfileFeedback,
      setCareerMatchSetup,
      setMatchNavAction,
      setMarketFilters,
      setMarketSort,
      setScreen,
    });
  }, []);

  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const foreignTarget = foreignPlayerId ? getBoardTarget(scoutBoard, foreignPlayerId) : null;
  const navActions: HubNavActions = {
    week,
    weekday,
    simulating,
    onNext: () => void handleNext(),
    onNewGame: resetGame,
    onOpenSaves: () => setSaveManagerOpen(true),
    primaryAction: careerMatchSetup ? matchNavAction : null,
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

  if (careerMatchSetup) {
    return (
      <>
        <AppChrome
          screen="hub"
          week={week}
          onNavigate={setScreen}
          onCampusNavigate={() => setCampusYearOpen(false)}
          hubActions={navActions}
        />
        <CareerMatch
          setup={careerMatchSetup}
          players={players}
          week={week}
          weekday={weekday}
          tacticsPresets={tacticsPresets}
          onSaveTacticsPreset={handleSaveTacticsPreset}
          simulating={simulating}
          onComplete={() => void completeCareerMatch(false)}
          onSkip={() => void completeCareerMatch(true)}
          onNavActionChange={setMatchNavAction}
        />
        {saveManagerOverlay}
      </>
    );
  }

  if (foreignTarget) {
    return (
      <>
        <AppChrome
          screen={screen}
          week={week}
          onNavigate={setScreen}
          onCloseProfile={() => setForeignPlayerId(null)}
          onCampusNavigate={() => setCampusYearOpen(false)}
          hubActions={navActions}
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
          onBack={() => setForeignPlayerId(null)}
          onAssignScout={() => handleAssignScout(foreignTarget.player.id)}
          onToggleShortlist={() => handleToggleShortlist(foreignTarget.player.id)}
          onPurchase={() => handlePurchase(foreignTarget.player.id)}
        />
        {saveManagerOverlay}
      </>
    );
  }

  if (profilePlayer) {
    return (
      <>
        <AppChrome
          screen={screen}
          week={week}
          onNavigate={setScreen}
          onCloseProfile={() => setProfileId(null)}
          onCampusNavigate={() => setCampusYearOpen(false)}
          hubActions={navActions}
        />
        <PlayerProfile
          player={profilePlayer}
          owned
          week={week}
          season={season}
          actionFeedback={profileFeedback}
          onProfileAction={(action) => handleProfileAction(profilePlayer.id, action)}
          onBack={() => {
            setProfileId(null);
            setProfileFeedback(null);
          }}
          onOpenYouth={
            profilePlayer.squad_status === "u17" || profilePlayer.squad_status === "u19"
              ? () => {
                  setProfileId(null);
                  setCampusYearOpen(true);
                  setScreen("campus");
                }
              : undefined
          }
        />
        {saveManagerOverlay}
      </>
    );
  }

  return (
    <>
      <AppChrome
        screen={screen}
        week={week}
        onNavigate={setScreen}
        onCampusNavigate={() => setCampusYearOpen(false)}
        hubActions={navActions}
      />
      <div hidden={screen !== "hub"}>
        <PipelineDashboard
          key={save.manifest.created}
          players={players}
          season={season}
          week={week}
          lastSaved={save.manifest.last_played}
          trainingPlan={trainingPlan}
          onTrainingPlanChange={handleTrainingPlanChange}
          activeScouts={activeScoutCount(scoutBoard)}
          league={league}
          finances={finances}
          clubId={session.clubId}
          onSelectPlayer={setProfileId}
          onOpenYouth={() => {
            setCampusYearOpen(false);
            setScreen("campus");
          }}
          onOpenScouting={() => setScreen("scouting")}
          onOpenTransfers={() => setScreen("transfers")}
          onOpenSquad={() => setScreen("squad")}
          onOpenFinances={() => setScreen("finances")}
          onOpenInbox={openInbox}
          onSelectScoutTarget={(playerId) => setForeignPlayerId(playerId)}
          youthInbox={youthInbox}
          scoutBoard={scoutBoard}
          clubEvents={clubEvents}
        />
      </div>
      {inboxOpen && pendingInboxItems(youthInbox, players).length > 0 ? (
        <DecisionInboxModal
          inbox={youthInbox}
          players={players}
          clubId={session.clubId}
          season={season}
          week={week}
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
          yearOpen={campusYearOpen}
          onYearOpenChange={setCampusYearOpen}
          onSelectPlayer={setProfileId}
          onDepartureRisk={openInbox}
        />
      ) : null}
      {screen === "scouting" ? (
        <ScoutingCenter
          targets={Object.values(scoutBoard.targets)}
          filters={marketFilters}
          onFiltersChange={setMarketFilters}
          sort={marketSort}
          onSortChange={setMarketSort}
          onBack={() => setScreen("hub")}
          onSelectTarget={(playerId) => setForeignPlayerId(playerId)}
          onAssignScout={handleAssignScout}
        />
      ) : null}
      {screen === "transfers" ? (
        <TransfersScreen
          players={players}
          season={season}
          week={week}
          history={transferState.history}
          onBack={() => setScreen("hub")}
          onSelectPlayer={setProfileId}
          onRecallLoan={handleRecallLoan}
        />
      ) : null}
      {screen === "squad" ? (
        <FirstTeam
          players={players}
          clubId={session.clubId}
          season={season}
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
          onBack={() => setScreen("hub")}
          onOpenStadium={() => setScreen("stadium")}
        />
      ) : null}
      {screen === "stadium" ? (
        <StadiumScreen
          stadium={stadium}
          finances={finances}
          onStadiumChange={(next) =>
            patchSession((current) => ({
              ...current,
              stadium: next,
            }))
          }
          onPurchaseUpgrade={handlePurchaseStadiumUpgrade}
          onBack={() => setScreen("finances")}
        />
      ) : null}
      {screen === "matchday" ? <Matchday /> : null}
      {saveManagerOverlay}
    </>
  );
}

interface HubNavActions {
  week: number;
  weekday: number;
  simulating: boolean;
  onNext: () => void;
  onNewGame: () => void;
  onOpenSaves: () => void;
  primaryAction?: NavPrimaryAction | null;
}

function AppChrome({
  week,
  screen,
  onNavigate,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
}: {
  week: number;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
}) {
  return (
    <>
      <AppNav
        screen={screen}
        onNavigate={onNavigate}
        onCloseProfile={onCloseProfile}
        onCampusNavigate={onCampusNavigate}
        hubActions={hubActions}
      />
      <TransferWindowAmbience week={week} />
    </>
  );
}

function AppNav({
  screen,
  onNavigate,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="app-nav" aria-label="Bereiche">
      <div className="app-nav-tabs">
      <NavButton
        pressed={screen === "hub"}
        label="Pipeline"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("hub");
        }}
      >
        ●
      </NavButton>
      <NavButton
        pressed={screen === "squad"}
        label="Kader"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("squad");
        }}
      >
        ⭐
      </NavButton>
      <NavButton
        pressed={screen === "campus"}
        label="Jugend"
        onClick={() => {
          onCloseProfile?.();
          onCampusNavigate?.();
          onNavigate("campus");
        }}
      >
        🏫
      </NavButton>
      <NavButton
        pressed={screen === "scouting"}
        label="Scouting"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("scouting");
        }}
      >
        👁️
      </NavButton>
      <NavButton
        pressed={screen === "transfers"}
        label="Transfers"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("transfers");
        }}
      >
        💰
      </NavButton>
      </div>
      <div className="app-nav-actions">
        <WeekdayStrip week={hubActions.week} weekday={hubActions.weekday} />
        <button
          type="button"
          className="app-nav-next"
          onClick={hubActions.primaryAction?.onClick ?? hubActions.onNext}
          disabled={hubActions.primaryAction?.disabled ?? hubActions.simulating}
          title={
            hubActions.primaryAction?.title ??
            (hubActions.primaryAction ? hubActions.primaryAction.label : "Smart Skip — zum nächsten Ereignis")
          }
        >
          {hubActions.simulating && !hubActions.primaryAction
            ? "…"
            : hubActions.primaryAction?.label ?? "▶ Next"}
        </button>
        <div className="row-menu app-nav-menu" ref={menuRef}>
          <button
            type="button"
            className="row-menu-trigger"
            aria-label="Weitere Aktionen"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((open) => !open);
              if (menuOpen) setResetAsk(false);
            }}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div className="row-menu-popover pipeline-menu-popover" role="menu">
              {resetAsk ? (
                <>
                  <p className="pipeline-menu-note">Spielstand löschen und neu starten?</p>
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
                    Ja, neu starten
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => setResetAsk(false)}
                  >
                    Abbrechen
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item"
                    onClick={() => {
                      hubActions.onOpenSaves();
                      setMenuOpen(false);
                    }}
                  >
                    💾 Spielstände
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
                    ⚽ Matchday Sandbox
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item pipeline-menu-danger"
                    onClick={() => setResetAsk(true)}
                  >
                    Neues Spiel
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}
