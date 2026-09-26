import { useCallback, useState } from "react";
import { applyTrainingWeek } from "./development/pipeline-week.ts";
import { createInitialTrainingPlan, planToSessions } from "./development/training-units.ts";
import type { TrainingSlot } from "./development/training-units.ts";
import { Matchday } from "./match/Matchday";
import {
  activeScoutCount,
  advanceScoutWeek,
  assignScout,
  createScoutBoard,
  getBoardTarget,
  type ScoutBoard,
} from "./scouting/scout-board.ts";
import { loadDemoRoster } from "./ui/demo-roster.ts";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
import { PlayerProfile } from "./ui/screens/PlayerProfile";
import { ScoutingCenter } from "./ui/screens/ScoutingCenter";
import { YouthCampus } from "./ui/screens/YouthCampus";
import type { Player } from "./types/player.ts";

type Screen = "hub" | "campus" | "matchday" | "scouting";

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [week, setWeek] = useState(1);
  const [players, setPlayers] = useState<Player[]>(() => loadDemoRoster());
  const [scoutBoard, setScoutBoard] = useState<ScoutBoard>(() => createScoutBoard());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [foreignPlayerId, setForeignPlayerId] = useState<string | null>(null);
  const [campusYearOpen, setCampusYearOpen] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState<TrainingSlot[]>(() => createInitialTrainingPlan());
  const profilePlayer = players.find((player) => player.id === profileId) ?? null;
  const foreignTarget = foreignPlayerId ? getBoardTarget(scoutBoard, foreignPlayerId) : null;

  const simulateWeek = useCallback(() => {
    const sessions = planToSessions(trainingPlan);
    setPlayers((current) => current.map((player) => applyTrainingWeek(player, sessions)));
    setScoutBoard((current) => advanceScoutWeek(current));
    setWeek((current) => current + 1);
  }, [trainingPlan]);

  const handleAssignScout = useCallback((playerId: string) => {
    setScoutBoard((current) => assignScout(current, playerId));
  }, []);

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
          players={players}
          week={week}
          trainingPlan={trainingPlan}
          onTrainingPlanChange={setTrainingPlan}
          activeScouts={activeScoutCount(scoutBoard)}
          onSimulateWeek={simulateWeek}
          onSelectPlayer={setProfileId}
          onOpenYouth={() => {
            setCampusYearOpen(false);
            setScreen("campus");
          }}
          onOpenScouting={() => setScreen("scouting")}
        />
      </div>
      {screen === "campus" ? (
        <YouthCampus
          players={players}
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
