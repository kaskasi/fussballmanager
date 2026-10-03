import { useMemo } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { Player } from "../../types/player.ts";
import { validateWeeklyPlan } from "../../development/weekly-plan.ts";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { calendarPhaseLabel, formatCalendarWeek } from "../../sim/game-calendar.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { transferWindowLabel } from "../../sim/transfer-windows.ts";
import {
  clubShortName,
  formatFixtureResult,
  lastPlayerResult,
  leagueTable,
  playerFixture,
  playerTableRow,
} from "../../sim/league-week.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { scoutReportsForWeek } from "../../scouting/scout-board.ts";
import { pendingInboxItems, inboxSummary, type YouthInboxState } from "../../youth/decision-inbox.ts";
import type { DecisionAction } from "../../youth/decision-inbox.ts";
import { listDevelopmentMovers } from "../../player/ca-tracking.ts";
import { pipelineStageFill, squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import { GrowthHeatmap, PipelineFillChart } from "../components/GrowthHeatmap.tsx";
import type { IndividualProgram } from "../../development/individual-training.ts";
import { fatigueAmpelClassName, squadTrainingLoad } from "../../development/training-load.ts";
import type { BoardState } from "../../board/board-state.ts";
import { BoardObjectivesPanel } from "../components/BoardObjectivesPanel.tsx";
import { DevelopmentHubPanel } from "../components/DevelopmentHubPanel.tsx";
import { HubInboxPanel } from "../components/HubInboxPanel.tsx";
import { SeasonAwardsGallery } from "../components/SeasonAwardsGallery.tsx";
import { SummerChecklistPanel } from "../components/SummerChecklistPanel.tsx";
import type { SeasonAwardsSnapshot } from "../../sim/season-awards.ts";
import { showSummerChecklist } from "../../sim/summer-checklist.ts";
import { FanFeedStrip } from "../components/FanFeedStrip.tsx";
import { ChroniclePanel } from "../components/ChroniclePanel.tsx";
import type { StoryState } from "../../narrative/story-state.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 1 — Pipeline Dashboard
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ [Chart: Pipeline-Füllung nach Stufe]                  │
 * │ 🏋️ Training: [Ampel]  🎯 Fokus-Slots                   │
 * │ 🏫 Jugend · 👁️ Scouting                               │
 * │ Heatmap Wochenzuwachs (02.1)                          │
 * └────────────────────────────────────────────────────────┘
 */

export function PipelineDashboard({
  players,
  season,
  week,
  trainingPlan,
  trainingIntensity,
  individualPrograms,
  onSelectPlayer,
  onOpenScouting,
  onOpenTransfers,
  onOpenInbox,
  onStoryChoice,
  onOpenJugend,
  onSelectScoutTarget,
  youthInbox,
  scoutBoard,
  league,
  finances,
  board,
  clubId,
  clubEvents,
  onOpenTraining,
  lastSeasonAwards,
  activeScouts,
  storyState,
}: {
  players: Player[];
  season: number;
  week: number;
  trainingPlan: TrainingSlot[];
  trainingIntensity: number;
  individualPrograms: IndividualProgram[];
  onTrainingPlanChange: (plan: TrainingSlot[]) => void;
  activeScouts: number;
  onSelectPlayer: (playerId: string) => void;
  onOpenScouting: () => void;
  onOpenTransfers: () => void;
  onOpenInbox: (itemId?: string) => void;
  onStoryChoice: (itemId: string, action: DecisionAction) => void;
  onOpenJugend: () => void;
  onSelectScoutTarget: (playerId: string) => void;
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  league: LeagueState;
  finances: ClubFinances;
  board: BoardState;
  clubId: string;
  clubEvents: readonly ClubEvent[];
  onOpenTraining?: () => void;
  lastSeasonAwards?: SeasonAwardsSnapshot;
  storyState: StoryState;
}) {
  const sessions = useMemo(() => planToSessions(trainingPlan), [trainingPlan]);
  const planOk = validateWeeklyPlan(sessions).valid;
  const focusCount = trainingPlan.filter((slot) => slot.focus).length;
  const trainingLoad = useMemo(
    () => squadTrainingLoad(players, clubId, trainingIntensity, focusCount, individualPrograms.length),
    [players, clubId, trainingIntensity, focusCount, individualPrograms.length],
  );
  const loanCount = players.filter((player) => player.squad_status === "loaned_out").length;
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
  const developmentMovers = useMemo(
    () => listDevelopmentMovers(players, clubId),
    [players, clubId],
  );
  const stageFill = useMemo(() => pipelineStageFill(players, clubId), [players, clubId]);
  const heatCells = useMemo(() => squadGrowthHeatmap(players, clubId), [players, clubId]);
  const matchdayLabel = league.season_complete
    ? "Saison beendet"
    : `Spieltag ${Math.min(league.matchday, seasonMatchdays)}/${seasonMatchdays}`;
  const scoutReports = scoutReportsForWeek(scoutBoard, week);
  const pendingDecisions = pendingInboxItems(youthInbox, players);
  const showInboxPanel =
    pendingDecisions.length > 0 || scoutReports.length > 0 || clubEvents.length > 0;
  const showObjectives = board.objectives.length > 0 && board.job_status !== "dismissed";

  return (
    <main className="pipeline">
      <header className="pipeline-head pipeline-head-compact">
        <div className="pipeline-head-primary">
          <p className="pipeline-eyebrow">
            {formatSeasonLabel(season)} · {formatCalendarWeek(week)} · {calendarPhaseLabel(week)}
            {transferWindowLabel(week) !== "Fenster geschlossen" ? ` · ${transferWindowLabel(week)}` : ""}
          </p>
          <p className="pipeline-matchline">
            {lastResult ? (
              <span>Letztes Spiel: {formatFixtureResult(lastResult, league.player_club_id)}</span>
            ) : (
              <span>Noch kein Ligaspiel</span>
            )}
            <span> · {matchdayLabel}</span>
            {nextOpponent ? <span> · vs {nextOpponent}</span> : null}
          </p>
        </div>
        <div className="pipeline-head-chips">
          <span className="pipeline-chip pipeline-league" aria-label="Liga">
            {tableRow ? (
              <>
                #{leagueTablePlace(league)} · {tableRow.points} Pkt · {tableRow.goalDifference > 0 ? "+" : ""}
                {tableRow.goalDifference}
              </>
            ) : (
              "Liga —"
            )}
          </span>
        </div>
      </header>

      <FanFeedStrip fanFeed={storyState.fan_feed} mediaHype={storyState.media_hype} />

      <SummerChecklistPanel
        week={week}
        season={season}
        league={league}
        board={board}
        trainingPlan={trainingPlan}
      />
      {lastSeasonAwards && showSummerChecklist(week, league) ? (
        <SeasonAwardsGallery snapshot={lastSeasonAwards} />
      ) : null}

      <section className="pipeline-core" aria-label="Aktionen">
        <PipelineFillChart fill={stageFill} />
        <GrowthHeatmap cells={heatCells} onSelectPlayer={onSelectPlayer} />
        <div className="pipeline-tiles pipeline-tiles-row">
          <button type="button" className="pipeline-tile" onClick={onOpenTraining}>
            <span
              className={`pipeline-light ${fatigueAmpelClassName(trainingLoad.ampel)}`}
              aria-hidden="true"
              title={trainingLoad.label}
            >
              {trainingLoad.icon}
            </span>
            <span>
              🏋️ Training · {focusCount}/3 Fokus
              {!planOk ? " · Plan prüfen" : ""}
            </span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenJugend}>
            <span
              className={`pipeline-light ${youthAmpelClass(youthInbox)}`}
              aria-hidden="true"
            >
              {youthAmpelMark(youthInbox)}
            </span>
            <span>{youthTileLabel(youthInbox)}</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenScouting}>
            <span>👁️</span>
            <span>Scouting · {activeScouts} aktiv</span>
          </button>
          <button type="button" className="pipeline-tile" onClick={onOpenTransfers}>
            <span>↔️</span>
            <span>{loanCount > 0 ? `Leihen · ${loanCount} verliehen` : "Leihen"}</span>
          </button>
        </div>
      </section>

      <section className="pipeline-secondary" aria-label="Details">
        {showInboxPanel ? (
          <HubInboxPanel
            week={week}
            season={season}
            players={players}
            youthInbox={youthInbox}
            scoutBoard={scoutBoard}
            clubEvents={clubEvents}
            onOpenDecision={(itemId) => onOpenInbox(itemId)}
            onStoryChoice={onStoryChoice}
            onSelectScoutTarget={onSelectScoutTarget}
          />
        ) : null}
        {showObjectives ? (
          <BoardObjectivesPanel board={board} league={league} finances={finances} />
        ) : null}
        <DevelopmentHubPanel movers={developmentMovers} onSelectPlayer={onSelectPlayer} />
        <ChroniclePanel entries={storyState.chronicle_entries} />
      </section>
    </main>
  );
}

function leagueTablePlace(league: LeagueState): number {
  const index = leagueTable(league).findIndex((row) => row.teamId === league.player_club_id);
  return index >= 0 ? index + 1 : 0;
}

function youthAmpelMark(inbox: YouthInboxState): string {
  const summary = inboxSummary(inbox);
  if (summary.departureRisks > 0) return "◆";
  if (summary.pending > 0) return "▲";
  return "●";
}

function youthAmpelClass(inbox: YouthInboxState): string {
  const summary = inboxSummary(inbox);
  if (summary.departureRisks > 0) return "is-risk";
  if (summary.pending > 0) return "is-watch";
  return "is-set";
}

function youthTileLabel(inbox: YouthInboxState): string {
  const summary = inboxSummary(inbox);
  if (summary.departureRisks > 0) {
    return `🏫 Jugend · 🚩 ${summary.departureRisks} Abgang`;
  }
  if (summary.pending > 0) {
    return `🏫 Jugend · ⚠️ ${summary.pending} offen`;
  }
  return "🏫 Jugend · ruhig";
}
