import { useMemo, useState } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { formatGrowthDelta, weeklyGrowthDelta } from "../../player/growth-history.ts";
import type { Player } from "../../types/player.ts";
import { validateWeeklyPlan } from "../../development/weekly-plan.ts";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { calendarPhaseLabel } from "../../sim/game-calendar.ts";
import { transferWindowLabel } from "../../sim/transfer-windows.ts";
import {
  clubShortName,
  formatFixtureResult,
  lastPlayerResult,
  leagueTable,
  playerFixture,
  playerTableRow,
} from "../../sim/league-week.ts";
import { formatClubCash, weeklyWageBill, type ClubFinances } from "../../economy/club-finances.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { inboxSummary, type YouthInboxState } from "../../youth/decision-inbox.ts";
import { listDevelopmentMovers } from "../../player/ca-tracking.ts";
import type { BoardState } from "../../board/board-state.ts";
import { BoardObjectivesPanel } from "../components/BoardObjectivesPanel.tsx";
import { DevelopmentHubPanel } from "../components/DevelopmentHubPanel.tsx";
import { HubInboxPanel } from "../components/HubInboxPanel.tsx";
import { LeagueHubPanel } from "../components/LeagueHubPanel.tsx";
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
  onSelectPlayer,
  onOpenYouth,
  onOpenScouting,
  onOpenTransfers,
  onOpenSquad,
  onOpenFinances,
  onOpenInbox,
  onSelectScoutTarget,
  youthInbox,
  scoutBoard,
  league,
  finances,
  board,
  clubId,
  clubEvents,
}: {
  players: Player[];
  season: number;
  week: number;
  lastSaved: string;
  trainingPlan: TrainingSlot[];
  onTrainingPlanChange: (plan: TrainingSlot[]) => void;
  activeScouts: number;
  onSelectPlayer: (playerId: string) => void;
  onOpenYouth: () => void;
  onOpenScouting: () => void;
  onOpenTransfers: () => void;
  onOpenSquad: () => void;
  onOpenFinances: () => void;
  onOpenInbox: (itemId?: string) => void;
  onSelectScoutTarget: (playerId: string) => void;
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  league: LeagueState;
  finances: ClubFinances;
  board: BoardState;
  clubId: string;
  clubEvents: readonly ClubEvent[];
}) {
  const [panel, setPanel] = useState<"hub" | "training">("hub");
  const [legend, setLegend] = useState(false);
  const sessions = useMemo(() => planToSessions(trainingPlan), [trainingPlan]);
  const planOk = validateWeeklyPlan(sessions).valid;
  const focusCount = trainingPlan.filter((slot) => slot.focus).length;
  const cells = useMemo(
    () =>
      players.map((player) => ({
        id: player.id,
        position: player.position,
        delta: weeklyGrowthDelta(player),
      })),
    [players],
  );
  const peak = Math.max(...cells.map((cell) => Math.abs(cell.delta ?? 0)), 0.01);
  const stages = [
    { id: "u17", icon: "🏫", count: players.filter((player) => player.squad_status === "u17").length },
    { id: "u19", icon: "⬆️", count: players.filter((player) => player.squad_status === "u19").length },
    { id: "pro", icon: "⭐", count: players.filter((player) => player.squad_status === "pro").length },
  ];
  const stagePeak = Math.max(...stages.map((stage) => stage.count), 1);
  const inbox = inboxSummary(youthInbox);
  const loanCount = players.filter((player) => player.squad_status === "loaned_out").length;
  const proCount = players.filter((player) => player.squad_status === "pro").length;
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
  const seasonMatchdays = totalSeasonMatchdays(league);
  const wageBill = weeklyWageBill(players, clubId);
  const developmentMovers = useMemo(
    () => listDevelopmentMovers(players, clubId),
    [players, clubId],
  );
  const matchdayLabel = league.season_complete
    ? "Saison beendet"
    : `Spieltag ${Math.min(league.matchday, seasonMatchdays)}/${seasonMatchdays}`;

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
          <p className="eyebrow">
            Saison {season} · KW {week} · {calendarPhaseLabel(week)}
            {transferWindowLabel(week) !== "Fenster geschlossen" ? ` · ${transferWindowLabel(week)}` : ""}
          </p>
          <h2 className="pipeline-title">Pipeline</h2>
        </div>
        <div className="pipeline-head-main">
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
          <button
            type="button"
            className="pipeline-finance"
            title={`Gehälter diese Woche: ${formatClubCash(wageBill)} · Transfer-Topf ${formatClubCash(finances.transfer_budget)}`}
            onClick={onOpenFinances}
          >
            💰 {formatClubCash(finances.cash)}
          </button>
          <p className="pipeline-save" title={lastSaved}>💾 Gespeichert</p>
        </div>
      </header>
      <p className="pipeline-matchline">
        {lastResult ? (
          <span>Letztes Spiel: {formatFixtureResult(lastResult, league.player_club_id)}</span>
        ) : (
          <span>Noch kein Ligaspiel</span>
        )}
        {league.season_complete ? (
          <span> · {matchdayLabel} — Tabelle final</span>
        ) : (
          <>
            <span> · {matchdayLabel}</span>
            {nextOpponent ? <span> · Nächster Gegner: {nextOpponent}</span> : null}
          </>
        )}
      </p>
      <BoardObjectivesPanel board={board} league={league} finances={finances} />
      <HubInboxPanel
        week={week}
        season={season}
        players={players}
        youthInbox={youthInbox}
        scoutBoard={scoutBoard}
        clubEvents={clubEvents}
        onOpenDecision={(itemId) => onOpenInbox(itemId)}
        onSelectScoutTarget={onSelectScoutTarget}
      />
      <DevelopmentHubPanel movers={developmentMovers} onSelectPlayer={onSelectPlayer} />
      <LeagueHubPanel league={league} />
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
          <button type="button" className="pipeline-tile" onClick={onOpenSquad}>
            <span>⭐</span>
            <span>Profikader · {proCount} Spieler</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenYouth}>
            <span>🏫</span>
            <span>Jugend-Campus · U17→U19→⭐</span>
          </button>
          <button
            type="button"
            className={inbox.pending > 0 ? "pipeline-tile pipeline-tile-inbox" : "pipeline-tile"}
            onClick={() => {
              if (inbox.pending > 0) onOpenInbox();
            }}
          >
            <span>📥</span>
            <span>
              {inbox.pending > 0
                ? `${inbox.pending} Entscheidungen offen`
                : "Inbox · Entscheidungen & Scouts"}
            </span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenScouting}>
            <span>👁️</span>
            <span>🟢 {activeScouts} Scout-Ziele aktiv · Marktliste</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenTransfers}>
            <span>💰</span>
            <span>
              {loanCount > 0 ? `${loanCount} verliehen · Transfers` : "Transfers · Historie"}
            </span>
          </button>
        </div>
        <div className="pipeline-heat-head">
          <p className="pipeline-heat-label">Letzte Woche — Klick öffnet Profil</p>
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
        <div className="pipeline-heat" aria-label="Wochenzuwachs letzte simulierte Woche">
          {cells.map((cell) => {
            const delta = cell.delta;
            const intensity = delta === null ? 0.35 : 0.45 + (Math.abs(delta) / peak) * 0.55;
            const title =
              delta === null
                ? `${cell.position} · noch keine Woche simuliert`
                : `${cell.position} ${formatGrowthDelta(delta)}`;
            return (
              <button
                key={cell.id}
                type="button"
                className={
                  delta === null
                    ? "heat-cell is-pending"
                    : delta < 0
                      ? "heat-cell is-down"
                      : delta > 0
                        ? "heat-cell"
                        : "heat-cell is-flat"
                }
                style={{ opacity: intensity }}
                title={title}
                onClick={() => onSelectPlayer(cell.id)}
              >
                {delta === null ? "·" : delta < 0 ? "▼" : delta > 0 ? "▲" : "—"}
                <small>{cell.position}</small>
              </button>
            );
          })}
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
    "▲/▼ Letzte Woche (echte Deltas)",
    "· Noch keine Woche simuliert",
    "🏫 U17",
    "⬆️ U19",
    "⭐ Profi",
    "▶ Woche X simulieren (oben rechts)",
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
