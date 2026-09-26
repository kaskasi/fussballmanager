import { useMemo, useState } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { projectWeek } from "../../development/pipeline-week.ts";
import type { Player } from "../../types/player.ts";
import { validateWeeklyPlan } from "../../development/weekly-plan.ts";
import { TrainingCenter } from "./TrainingCenter.tsx";

/**
 * WIREFRAME: PRD 09.2 Screen 1 — Pipeline Dashboard
 */

export function PipelineDashboard({
  players,
  week,
  trainingPlan,
  onTrainingPlanChange,
  activeScouts,
  onSimulateWeek,
  onSelectPlayer,
  onOpenYouth,
  onOpenScouting,
}: {
  players: Player[];
  week: number;
  trainingPlan: TrainingSlot[];
  onTrainingPlanChange: (plan: TrainingSlot[]) => void;
  activeScouts: number;
  onSimulateWeek: () => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenYouth: () => void;
  onOpenScouting: () => void;
}) {
  const [panel, setPanel] = useState<"hub" | "training">("hub");
  const [legend, setLegend] = useState(false);
  const sessions = useMemo(() => planToSessions(trainingPlan), [trainingPlan]);
  const planOk = validateWeeklyPlan(sessions).valid;
  const focusCount = trainingPlan.filter((slot) => slot.focus).length;
  const cells = useMemo(
    () => players.map((player) => ({ id: player.id, position: player.position, total: projectWeek(player, sessions) })),
    [players, sessions],
  );
  const peak = Math.max(...cells.map((cell) => Math.abs(cell.total)), 0.01);
  const stages = [
    { id: "u17", icon: "🏫", count: players.filter((player) => player.squad_status === "u17").length },
    { id: "u19", icon: "⬆️", count: players.filter((player) => player.squad_status === "u19").length },
    { id: "pro", icon: "⭐", count: players.filter((player) => player.squad_status === "pro").length },
  ];
  const stagePeak = Math.max(...stages.map((stage) => stage.count), 1);

  if (panel === "training") {
    return (
      <TrainingCenter
        week={week}
        plan={trainingPlan}
        onPlanChange={onTrainingPlanChange}
        players={players}
        onBack={() => setPanel("hub")}
      />
    );
  }

  return (
    <main className="pipeline">
      <header className="pipeline-head">
        <p className="eyebrow">Pipeline</p>
        <button type="button" aria-pressed={legend} onClick={() => setLegend((open) => !open)}>
          Bedeutungen
        </button>
      </header>
      {legend ? <Legend /> : null}
      <section>
        <div className="pipeline-chart" aria-label="Pipeline nach Stufe">
          {stages.map((stage) => (
            <div key={stage.id} className="pipeline-stage">
              <div
                className="pipeline-bar"
                style={{ height: stage.count === 0 ? 0 : `${16 + (stage.count / stagePeak) * 72}px` }}
              />
              <span aria-hidden="true">{stage.icon}</span>
              <strong>{stage.count}</strong>
            </div>
          ))}
        </div>
        <div className="pipeline-tiles">
          <button type="button" className="pipeline-tile" onClick={() => setPanel("training")}>
            <span className={planOk ? "pipeline-light is-set" : "pipeline-light is-watch"} aria-hidden="true">
              {planOk ? "●" : "▲"}
            </span>
            <span>🏋️ Team-Plan · {focusCount}/3 Fokus</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenYouth}>
            <span>🏫</span>
            <span>⚠️ 0 Empfehlungen · 🚩 0 Abgangsrisiko</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenScouting}>
            <span>👁️</span>
            <span>🟢 {activeScouts} Scout-Ziele aktiv · Marktliste</span>
          </button>
        </div>
        <p className="pipeline-heat-label">Wochenzuwachs — Klick öffnet Profil</p>
        <div className="pipeline-heat" aria-label="Wochenzuwachs">
          {cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              className={cell.total < 0 ? "heat-cell is-down" : "heat-cell"}
              title={`${cell.position} ${Math.round(cell.total)}`}
              onClick={() => onSelectPlayer(cell.id)}
            >
              {cell.total < 0 ? "▼" : "▲"}
              <small>{cell.position}</small>
            </button>
          ))}
        </div>
        <button type="button" className="pipeline-go" onClick={onSimulateWeek}>
          ▶ Diese Woche simulieren <span className="pipeline-week">{week}</span>
        </button>
      </section>
    </main>
  );
}

function Legend() {
  const items = [
    "● Plan gültig",
    "▲ Plan prüfen",
    "🎯 Fokus-Einheit",
    "▲/▼ Wochenzuwachs",
    "🏫 U17",
    "⬆️ U19",
    "⭐ Profi",
    "▶ Woche simulieren",
  ];
  return (
    <ul className="pipeline-legend">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
