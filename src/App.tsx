import { useCallback, useState } from "react";
import { advanceLeagueWeek, applyProMatchMinutes } from "./sim/league-week.ts";
import { applyTrainingWeek } from "./development/pipeline-week.ts";
import { planToSessions } from "./development/training-units.ts";
import type { TrainingSlot } from "./development/training-units.ts";
import { Matchday } from "./match/Matchday";
import {
  DEFAULT_SLOT,
  newGameSession,
  saveFromSession,
  sessionFromSave,
} from "./persistence/game-session.ts";
import { loadLocalSave, removeLocalSave, writeLocalSave } from "./persistence/local-save.ts";
import type { SaveGame } from "./persistence/savegame-model.ts";
import {
  activeScoutCount,
  advanceScoutWeek,
  assignScout,
  getBoardTarget,
} from "./scouting/scout-board.ts";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
import { PlayerProfile } from "./ui/screens/PlayerProfile";
import { ScoutingCenter } from "./ui/screens/ScoutingCenter";
import { DecisionInboxModal } from "./ui/components/DecisionInbox.tsx";
import { YouthCampus } from "./ui/screens/YouthCampus";
import {
  advanceInboxWeek,
  applyInboxDecision,
  type DecisionAction,
} from "./youth/decision-inbox.ts";
import { simulateYouthWeek } from "./youth/youth-sim.ts";

type Screen = "hub" | "campus" | "matchday" | "scouting";

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
  const [simulating, setSimulating] = useState(false);

  const session = sessionFromSave(save);
  const { season, week, players, trainingPlan, scoutBoard, youthInbox, league } = session;

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
      const nextWeek = snapshot.week + 1;
      const leagueStep = await advanceLeagueWeek(
        snapshot.league,
        snapshot.season,
        nextWeek,
        snapshot.masterSeed,
      );
      const sessions = planToSessions(snapshot.trainingPlan);
      const trained = snapshot.players.map((player) => applyTrainingWeek(player, sessions));
      const withMinutes = applyProMatchMinutes(
        trained,
        leagueStep.playerFixture,
        snapshot.league.player_club_id,
      );
      const youth = simulateYouthWeek(withMinutes, snapshot.week, snapshot.masterSeed);
      const advanced = advanceInboxWeek(
        snapshot.youthInbox,
        youth.players,
        nextWeek,
        snapshot.masterSeed,
        youth.report,
      );
      setSave((current) => {
        const next = saveFromSession(
          {
            ...snapshot,
            week: nextWeek,
            players: advanced.players,
            scoutBoard: advanceScoutWeek(snapshot.scoutBoard),
            youthInbox: advanced.inbox,
            league: leagueStep.league,
          },
          current,
        );
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
          onBack={() => setForeignPlayerId(null)}
          onAssignScout={() => handleAssignScout(foreignTarget.player.id)}
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
          onBack={() => setProfileId(null)}
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
          simulating={simulating}
          onSimulateWeek={() => void simulateWeek()}
          onSelectPlayer={setProfileId}
          onOpenYouth={() => {
            setCampusYearOpen(false);
            setScreen("campus");
          }}
          onOpenScouting={() => setScreen("scouting")}
          onOpenInbox={() => setInboxOpen(true)}
          youthInbox={youthInbox}
          onNewGame={resetGame}
        />
      </div>
      {inboxOpen ? (
        <DecisionInboxModal
          inbox={youthInbox}
          players={players}
          onDecision={handleInboxDecision}
          onClose={() => setInboxOpen(false)}
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
