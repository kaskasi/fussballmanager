import { useEffect, useMemo, useRef, useState } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { projectWeek } from "../../development/pipeline-week.ts";
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
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { inboxSummary, type YouthInboxState } from "../../youth/decision-inbox.ts";
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
  onSimulateWeek,
  onSelectPlayer,
  onOpenYouth,
  onOpenScouting,
  onOpenLoans,
  onOpenSquad,
  onOpenInbox,
  onSelectScoutTarget,
  youthInbox,
  scoutBoard,
  league,
  finances,
  clubId,
  simulating,
  notice = null,
  onDismissNotice,
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
  onOpenLoans: () => void;
  onOpenSquad: () => void;
  onOpenInbox: (itemId?: string) => void;
  onSelectScoutTarget: (playerId: string) => void;
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  league: LeagueState;
  finances: ClubFinances;
  clubId: string;
  simulating: boolean;
  notice?: string | null;
  onDismissNotice?: () => void;
  onNewGame: () => void;
}) {
  const [panel, setPanel] = useState<"hub" | "training">("hub");
  const [legend, setLegend] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      {notice ? (
        <p className="pipeline-notice" role="status">
          {notice}
          {onDismissNotice ? (
            <button type="button" className="pipeline-notice-dismiss" onClick={onDismissNotice}>
              Schließen
            </button>
          ) : null}
        </p>
      ) : null}
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
          <p className="pipeline-finance" title={`Gehälter diese Woche: ${formatClubCash(wageBill)}`}>
            💰 {formatClubCash(finances.cash)}
          </p>
          <p className="pipeline-save" title={lastSaved}>💾 Gespeichert</p>
        </div>
        <div className="pipeline-head-actions">
          <button type="button" className="pipeline-go" onClick={onSimulateWeek} disabled={simulating}>
            {simulating ? "Simuliere…" : `▶ Woche ${week + 1} simulieren`}
          </button>
          <div className="row-menu" ref={menuRef}>
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
                        onNewGame();
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
                  <button
                    type="button"
                    role="menuitem"
                    className="row-menu-item pipeline-menu-danger"
                    onClick={() => setResetAsk(true)}
                  >
                    Neues Spiel
                  </button>
                )}
              </div>
            ) : null}
          </div>
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
      <HubInboxPanel
        week={week}
        players={players}
        youthInbox={youthInbox}
        scoutBoard={scoutBoard}
        onOpenDecision={(itemId) => onOpenInbox(itemId)}
        onSelectScoutTarget={onSelectScoutTarget}
      />
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
            onClick={() => onOpenInbox()}
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
          <button type="button" className="pipeline-tile" onClick={onOpenLoans}>
            <span>🔄</span>
            <span>
              {loanCount > 0 ? `${loanCount} verliehen · Ausleihen` : "Ausleihen · noch leer"}
            </span>
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
