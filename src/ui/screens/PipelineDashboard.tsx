import { useMemo, useState } from "react";
import { applyTrainingWeek, HUB_PLAN, projectWeek } from "../../development/pipeline-week.ts";
import { unknownPlayer, confidenceLabel } from "../../scouting/estimate-model.ts";
import type { Player } from "../../types/player.ts";
import { generateYouthIntake } from "../../youth/intake-generator.ts";
import { validateWeeklyPlan } from "../../development/weekly-plan.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 1 — Pipeline Dashboard
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ [Chart: Pipeline-Füllung nach Stufe]                  │
 * │ 🏋️ Training: [●]  🎯 3 Fokus-Slots gesetzt            │
 * │ 🏫 Jugend:   [⚠️ 0] Empfehlungen · [🚩 0] Abgangsrisiko│
 * │ 👁️ Scouting: [🟢 0] Scouts aktiv · [❓ 0] offene Reports│
 * │ [Heatmap: Wochenzuwachs]                              │
 * │ [▶ Diese Woche simulieren]                            │
 * └────────────────────────────────────────────────────────┘
 *
 * The wireframe's 3 scouts and 7 reports are an example. This club has
 * none until scouts are hired. Youth warnings stay 0 until the youth sim
 * and departure rules exist. The light is ● because the plan is valid.
 * Fatigue has no formula, so the light is not a fitness claim.
 */

export function PipelineDashboard({ onOpenYouth }: { onOpenYouth: () => void }) {
  const [players, setPlayers] = useState<Player[]>(() => loadIntake());
  const [week, setWeek] = useState(1);
  const [panel, setPanel] = useState<"hub" | "training" | "scouting">("hub");
  const [legend, setLegend] = useState(false);
  const [trainingSeen, setTrainingSeen] = useState(true);
  const planOk = validateWeeklyPlan(HUB_PLAN).valid;
  const focusCount = HUB_PLAN.filter((session) => session.focus).length;
  const cells = useMemo(
    () => players.map((player) => ({ id: player.id, position: player.position, total: projectWeek(player, HUB_PLAN) })),
    [players],
  );
  const peak = Math.max(...cells.map((cell) => Math.abs(cell.total)), 0.01);
  const stages = [
    { id: "u17", icon: "🏫", count: players.filter((player) => player.squad_status === "u17").length },
    { id: "u19", icon: "⬆️", count: players.filter((player) => player.squad_status === "u19").length },
    { id: "pro", icon: "⭐", count: players.filter((player) => player.squad_status === "pro").length },
  ];
  const stagePeak = Math.max(...stages.map((stage) => stage.count), 1);

  function simulateWeek() {
    setPlayers((current) => current.map((player) => applyTrainingWeek(player, HUB_PLAN)));
    setWeek((current) => current + 1);
    setTrainingSeen(false);
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
      {panel === "training" ? (
        <TrainingPanel
          onBack={() => {
            setTrainingSeen(true);
            setPanel("hub");
          }}
        />
      ) : null}
      {panel === "scouting" ? <ScoutingPanel onBack={() => setPanel("hub")} /> : null}
      {panel === "hub" ? (
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
              {!trainingSeen ? <span className="pipeline-dot" aria-label="Neu" /> : null}
              <span>
                <span className={planOk ? "pipeline-light is-set" : "pipeline-light is-watch"} aria-hidden="true">
                  {planOk ? "●" : "▲"}
                </span>{" "}
                🏋️ 🎯 {focusCount} Fokus-Slots gesetzt
              </span>
            </button>
            <button type="button" className="pipeline-tile" onClick={onOpenYouth}>
              <span>🏫</span>
              <span>⚠️ 0 Empfehlungen · 🚩 0 Abgangsrisiko</span>
            </button>
            <button type="button" className="pipeline-tile" onClick={() => setPanel("scouting")}>
              <span>👁️</span>
              <span>🟢 0 Scouts aktiv · ❓ 0 offene Reports</span>
            </button>
          </div>
          <div className="pipeline-heat" aria-label="Wochenzuwachs">
            {cells.map((cell) => (
              <span
                key={cell.id}
                className={cell.total < 0 ? "heat-cell is-down" : "heat-cell"}
                title={`${cell.position} ${cell.total.toFixed(1)}`}
                style={{ opacity: 0.35 + (Math.min(Math.abs(cell.total), peak) / peak) * 0.65 }}
              >
                {cell.total < 0 ? "▲" : "●"}
                <small>{cell.position}</small>
              </span>
            ))}
          </div>
          <button type="button" className="pipeline-go" onClick={simulateWeek}>
            ▶ Diese Woche simulieren <span className="pipeline-week">{week}</span>
          </button>
        </section>
      ) : null}
    </main>
  );
}

function TrainingPanel({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
        ←
      </button>
      <h1>🏋️</h1>
      <ul className="pipeline-slots">
        {HUB_PLAN.map((session, index) => (
          <li key={`${session.group}-${index}`} title={session.group}>
            {session.focus ? "🎯" : "●"}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoutingPanel({ onBack }: { onBack: () => void }) {
  const prior = confidenceLabel(unknownPlayer());
  return (
    <section>
      <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
        ←
      </button>
      <h1>👁️</h1>
      <p className="pipeline-scout">
        <span>🟢 0</span>
        <span title={prior ?? ""}>❓ 0</span>
      </p>
    </section>
  );
}

function Legend() {
  const items = ["● Plan gesetzt", "▲ Achtung", "🎯 Fokus", "🏫 U17", "⬆️ U19", "⭐ Profi", "⚠️ Empfehlung", "🚩 Abgang", "🟢 Scout frei", "❓ Unbekannt", "▶ Woche"];
  return (
    <ul className="pipeline-legend">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function loadIntake(): Player[] {
  return generateYouthIntake({
    season: 1,
    week: 34,
    seasonYear: 2026,
    clubId: "cl_fc_nordstern",
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: "academy_basic",
    idStart: 1,
    random: mulberry32(2026),
  });
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
