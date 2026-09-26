import { useMemo, useState } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { projectWeek } from "../../development/pipeline-week.ts";
import type { Player } from "../../types/player.ts";
import { validateWeeklyPlan } from "../../development/weekly-plan.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import {
  clubShortName,
  formatFixtureResult,
  lastPlayerResult,
  leagueTable,
  playerFixture,
  playerTableRow,
} from "../../sim/league-week.ts";
import { inboxSummary, type YouthInboxState } from "../../youth/decision-inbox.ts";
import { TrainingCenter } from "./TrainingCenter.tsx";

/**
 * WIREFRAME: PRD 09.2 Screen 1 — Pipeline Dashboard
 */

export function PipelineDashboard({
  players,
  season,
  week,
  lastSaved,
  trainingPlan,
  onTrainingPlanChange,
  activeScouts,
  onSimulateWeek,
  onSelectPlayer,
  onOpenYouth,
  onOpenScouting,
  onOpenInbox,
  youthInbox,
  league,
  simulating,
  onNewGame,
}: {
  players: Player[];
  season: number;
  week: number;
  lastSaved: string;
  trainingPlan: TrainingSlot[];
  onTrainingPlanChange: (plan: TrainingSlot[]) => void;
  activeScouts: number;
  onSimulateWeek: () => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenYouth: () => void;
  onOpenScouting: () => void;
  onOpenInbox: () => void;
  youthInbox: YouthInboxState;
  league: LeagueState;
  simulating: boolean;
  onNewGame: () => void;
}) {
  const [panel, setPanel] = useState<"hub" | "training">("hub");
  const [legend, setLegend] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
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
  const inbox = inboxSummary(youthInbox);
  const tableRow = playerTableRow(league);
  const lastResult = lastPlayerResult(league);
  const nextFixture = playerFixture(league, league.matchday);
  const nextOpponent = nextFixture
    ? clubShortName(
        nextFixture.homeTeamId === league.player_club_id
          ? nextFixture.awayTeamId
          : nextFixture.homeTeamId,
      )
    : null;

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
        <div>
          <p className="eyebrow">Saison {season} · Woche {week}</p>
          <h2 className="pipeline-title">Pipeline</h2>
        </div>
        <div className="pipeline-head-meta">
          <p className="pipeline-league" aria-label="Liga">
            {tableRow ? (
              <>
                #{leagueTablePlace(league)} · {tableRow.points} Pkt · {tableRow.goalDifference > 0 ? "+" : ""}
                {tableRow.goalDifference}
              </>
            ) : (
              "Liga — Saisonstart"
            )}
          </p>
          <p className="pipeline-save" title={lastSaved}>💾 Gespeichert</p>
        </div>
      </header>
      <p className="pipeline-matchline">
        {lastResult ? (
          <span>Letztes Spiel: {formatFixtureResult(lastResult, league.player_club_id)}</span>
        ) : (
          <span>Noch kein Ligaspiel</span>
        )}
        {nextOpponent ? <span> · Nächster Gegner: {nextOpponent}</span> : null}
      </p>
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
            <span>
              Jugend-Campus · U17→U19→⭐ via 📥 Inbox
            </span>
          </button>
          {inbox.pending > 0 ? (
            <button type="button" className="pipeline-tile pipeline-tile-inbox" onClick={onOpenInbox}>
              <span>📥</span>
              <span>{inbox.pending} Entscheidungen offen</span>
            </button>
          ) : null}
          <button type="button" className="pipeline-tile" onClick={onOpenScouting}>
            <span>👁️</span>
            <span>🟢 {activeScouts} Scout-Ziele aktiv · Marktliste</span>
          </button>
        </div>
        <div className="pipeline-heat-head">
          <p className="pipeline-heat-label">Wochenzuwachs — Klick öffnet Profil</p>
          <button
            type="button"
            className="pipeline-legend-toggle"
            aria-pressed={legend}
            aria-label="Bedeutungen anzeigen"
            title="Bedeutungen"
            onClick={() => setLegend((open) => !open)}
          >
            ?
          </button>
        </div>
        {legend ? <Legend /> : null}
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
        <div className="pipeline-foot">
          {resetAsk ? (
            <div className="pipeline-reset-banner" role="status">
              <span>Spielstand löschen und neu starten?</span>
              <button
                type="button"
                className="pipeline-reset-confirm"
                onClick={() => {
                  onNewGame();
                  setResetAsk(false);
                }}
              >
                Ja, neu starten
              </button>
              <button type="button" onClick={() => setResetAsk(false)}>Abbrechen</button>
            </div>
          ) : (
            <button type="button" className="pipeline-reset" onClick={() => setResetAsk(true)}>
              Neues Spiel
            </button>
          )}
          <button type="button" className="pipeline-go" onClick={onSimulateWeek} disabled={simulating}>
            {simulating ? "Simuliere…" : "▶ Diese Woche simulieren"} <span className="pipeline-week">{week}</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function leagueTablePlace(league: LeagueState): number {
  const index = leagueTable(league).findIndex((row) => row.teamId === league.player_club_id);
  return index >= 0 ? index + 1 : 0;
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
    "📥 Entscheidungs-Inbox",
    "🚩 Abgangsrisiko",
  ];
  return (
    <ul className="pipeline-legend">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
