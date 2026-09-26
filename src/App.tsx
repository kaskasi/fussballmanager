import { useCallback, useState } from "react";
import type { TrainingSlot } from "./development/training-units.ts";
import { Matchday } from "./match/Matchday";
import {
  DEFAULT_CLUB_ID,
  DEFAULT_SLOT,
  newGameSession,
  saveFromSession,
  sessionFromSave,
} from "./persistence/game-session.ts";
import { loadLocalSave, removeLocalSave, writeLocalSave } from "./persistence/local-save.ts";
import type { SaveGame } from "./persistence/savegame-model.ts";
import {
  activeScoutCount,
  assignScout,
  getBoardTarget,
} from "./scouting/scout-board.ts";
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
import { FirstTeam } from "./ui/screens/FirstTeam.tsx";
import { LoanList } from "./ui/screens/LoanList.tsx";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
import { PlayerProfile } from "./ui/screens/PlayerProfile";
import { ScoutingCenter } from "./ui/screens/ScoutingCenter";
import { DecisionInboxModal } from "./ui/components/DecisionInbox.tsx";
import { YouthCampus } from "./ui/screens/YouthCampus";
import {
  applyProfileActionToSquad,
  type PlayerProfileAction,
} from "./player/profile-actions.ts";
import { applyInboxDecision, type DecisionAction } from "./youth/decision-inbox.ts";

type Screen = "hub" | "campus" | "matchday" | "scouting" | "loans" | "squad";

function bootstrapSave(): SaveGame {
  try {
    const loaded = loadLocalSave(DEFAULT_SLOT);
    if (loaded) return loaded;
  } catch {
    removeLocalSave(DEFAULT_SLOT);
  }
  const fresh = saveFromSession(newGameSession());
  writeLocalSave(DEFAULT_SLOT, fresh);
  return fresh;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [save, setSave] = useState<SaveGame>(bootstrapSave);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [campusYearOpen, setCampusYearOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItemId, setInboxItemId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [hubNotice, setHubNotice] = useState<string | null>(null);

  const session = sessionFromSave(save);
  const {
    season,
    week,
    players,
    trainingPlan,
    scoutBoard,
    youthInbox,
    league,
    transferState,
    finances,
  } = session;

  const patchSession = useCallback((recipe: (current: ReturnType<typeof sessionFromSave>) => ReturnType<typeof sessionFromSave>) => {
    setSave((current) => {
      const next = saveFromSession(recipe(sessionFromSave(current)), current);
      writeLocalSave(DEFAULT_SLOT, next);
      return next;
    });
  }, []);

  const simulateWeek = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      const snapshot = sessionFromSave(save);
      const result = await simulateGameWeek(snapshot);
      setSave((current) => {
        const next = saveFromSession(result.session, current);
        writeLocalSave(DEFAULT_SLOT, next);
        return next;
      });
    } finally {
      setSimulating(false);
    }
  }, [save, simulating]);

  const handleInboxDecision = useCallback(
    (itemId: string, action: DecisionAction) => {
      patchSession((current) => {
        const result = applyInboxDecision(
          current.youthInbox,
          current.players,
          itemId,
          action,
          current.season,
        );
        return {
          ...current,
          players: result.players,
          youthInbox: result.inbox,
        };
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
          setHubNotice("Angebot abgelehnt — höheres Gebot nötig.");
          return { ...current, transferState: deal.state };
        }

        const fee = deal.fee ?? sellerAskingPrice(target.player, current.season);
        if (!canAffordTransfer(current.finances, fee)) {
          setHubNotice(`Transfer-Budget zu niedrig (benötigt ca. ${formatClubCash(fee)}).`);
          return { ...current, transferState: deal.state };
        }

        const bought = completePurchase(target.player, DEFAULT_CLUB_ID, current.season);
        const targets = { ...current.scoutBoard.targets };
        delete targets[playerId];
        setHubNotice(`Zugang ${formatPlayerName(bought)} für ${formatClubCash(fee)}.`);
        return {
          ...current,
          players: [...current.players, bought],
          transferState: deal.state,
          scoutBoard: { targets },
          finances: applyTransferFee(current.finances, fee),
        };
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
        );
        if (!result) return current;
        if (result.removed) {
          setProfileId(null);
          setProfileFeedback(null);
          setHubNotice(result.message);
        } else {
          setProfileFeedback(result.message);
        }
        return { ...current, players: nextPlayers };
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
    removeLocalSave(DEFAULT_SLOT);
    const fresh = saveFromSession(newGameSession());
    writeLocalSave(DEFAULT_SLOT, fresh);
    setSave(fresh);
    setProfileId(null);
    setForeignPlayerId(null);
    setCampusYearOpen(false);
    setInboxOpen(false);
    setProfileFeedback(null);
    setHubNotice(null);
    setScreen("hub");
  }, []);

  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const foreignTarget = foreignPlayerId ? getBoardTarget(scoutBoard, foreignPlayerId) : null;

  if (foreignTarget) {
    return (
      <>
        <AppNav
          screen={screen}
          onNavigate={setScreen}
          onCloseProfile={() => setForeignPlayerId(null)}
          onCampusNavigate={() => setCampusYearOpen(false)}
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
      </>
    );
  }

  if (profilePlayer) {
    return (
      <>
        <AppNav
          screen={screen}
          onNavigate={setScreen}
          onCloseProfile={() => setProfileId(null)}
          onCampusNavigate={() => setCampusYearOpen(false)}
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
      </>
    );
  }

  return (
    <>
      <AppNav screen={screen} onNavigate={setScreen} onCampusNavigate={() => setCampusYearOpen(false)} />
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
          simulating={simulating}
          notice={hubNotice}
          onDismissNotice={() => setHubNotice(null)}
          onSimulateWeek={() => void simulateWeek()}
          onSelectPlayer={setProfileId}
          onOpenYouth={() => {
            setCampusYearOpen(false);
            setScreen("campus");
          }}
          onOpenScouting={() => setScreen("scouting")}
          onOpenLoans={() => setScreen("loans")}
          onOpenSquad={() => setScreen("squad")}
          onOpenInbox={(itemId) => {
            setInboxItemId(itemId ?? null);
            setInboxOpen(true);
          }}
          onSelectScoutTarget={(playerId) => setForeignPlayerId(playerId)}
          youthInbox={youthInbox}
          scoutBoard={scoutBoard}
          onNewGame={resetGame}
        />
      </div>
      {inboxOpen ? (
        <DecisionInboxModal
          inbox={youthInbox}
          players={players}
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
          onInboxDecision={handleInboxDecision}
          yearOpen={campusYearOpen}
          onYearOpenChange={setCampusYearOpen}
          onSelectPlayer={setProfileId}
        />
      ) : null}
      {screen === "scouting" ? (
        <ScoutingCenter
          targets={Object.values(scoutBoard.targets)}
          onBack={() => setScreen("hub")}
          onSelectTarget={(playerId) => setForeignPlayerId(playerId)}
          onAssignScout={handleAssignScout}
        />
      ) : null}
      {screen === "loans" ? (
        <LoanList
          players={players}
          season={season}
          onBack={() => setScreen("hub")}
          onSelectPlayer={setProfileId}
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
      {screen === "matchday" ? <Matchday /> : null}
    </>
  );
}

function AppNav({
  screen,
  onNavigate,
  onCloseProfile,
  onCampusNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
}) {
  return (
    <nav className="app-nav" aria-label="Bereiche">
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
        pressed={screen === "loans"}
        label="Ausleihen"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("loans");
        }}
      >
        🔄
      </NavButton>
      <NavButton
        pressed={screen === "matchday"}
        label="Matchday"
        onClick={() => {
          onCloseProfile?.();
          onNavigate("matchday");
        }}
      >
        ⚽
      </NavButton>
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
