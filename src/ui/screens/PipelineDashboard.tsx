import { useMemo } from "react";
import { planToSessions } from "../../development/training-units.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { Player } from "../../types/player.ts";
import { MAX_FOCUS_SLOTS, validateWeeklyPlan } from "../../development/weekly-plan.ts";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import {
  calendarPhaseDisplay,
  formatCalendarWeekDisplay,
  formatSeasonDisplay,
  transferWindowDisplay,
} from "../../i18n/calendar-display.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { transferWindowKind } from "../../sim/transfer-windows.ts";
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
import { buildPostfachArchive } from "../../inbox/postfach-archive.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { inboxSummary, type YouthInboxState } from "../../youth/decision-inbox.ts";
import type { DecisionAction } from "../../youth/decision-inbox.ts";
import { listDevelopmentMovers } from "../../player/ca-tracking.ts";
import { pipelineStageFill, squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import { GrowthHeatmap, PipelineFillCard } from "../components/GrowthHeatmap.tsx";
import type { IndividualProgram } from "../../development/individual-training.ts";
import { fatigueAmpelClassName, squadTrainingLoad } from "../../development/training-load.ts";
import type { BoardState } from "../../board/board-state.ts";
import { BoardObjectivesPanel } from "../components/BoardObjectivesPanel.tsx";
import { DevelopmentHubPanel } from "../components/DevelopmentHubPanel.tsx";
import { HubActionColumn } from "../components/HubActionColumn.tsx";
import { Eye, ArrowLeftRight } from "lucide-react";
import { SeasonAwardsGallery } from "../components/SeasonAwardsGallery.tsx";
import { SummerChecklistPanel } from "../components/SummerChecklistPanel.tsx";
import type { SeasonAwardsSnapshot } from "../../sim/season-awards.ts";
import { showSummerChecklist } from "../../sim/summer-checklist.ts";
import { ChroniclePanel } from "../components/ChroniclePanel.tsx";
import type { StoryState } from "../../narrative/story-state.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";

/**
 * WIREFRAME: docs/prd/design.md §9.9 — Hub cockpit
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ 🌱16 🌿4 ⭐22  (kleine Pipeline-Karte)                 │
 * │ 🏋️ Training: [Ampel]  🎯 Fokus-Slots                   │
 * │ 🏫 Jugend · 👁️ Scouting                               │
 * │ Team-Pixelbar: 1 Quadrat = 1 Spieler (02.1)           │
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
  onOpenPostfach,
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
  onViewAllEvents,
  lastSeasonAwards,
  activeScouts,
  storyState,
  youthCamps,
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
  onOpenPostfach: (itemId?: string) => void;
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
  onViewAllEvents: () => void;
  lastSeasonAwards?: SeasonAwardsSnapshot;
  storyState: StoryState;
  youthCamps: readonly YouthCamp[];
}) {
  useT();
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
  const heatCells = useMemo(() => squadGrowthHeatmap(players, clubId), [players, clubId]);
  const stageFill = useMemo(() => pipelineStageFill(players, clubId), [players, clubId]);
  const windowOpen = transferWindowKind(week) !== null;
  const matchdayLabel = league.season_complete
    ? t("hub.seasonComplete")
    : t("hub.matchday", {
        current: Math.min(league.matchday, seasonMatchdays),
        total: seasonMatchdays,
      });
  const showObjectives = board.objectives.length > 0 && board.job_status !== "dismissed";
  const hubArchivePreview = useMemo(
    () =>
      buildPostfachArchive({
        scoutBoard,
        clubEvents,
        youthInbox,
        players,
        season,
        storyCast: storyState.cast,
      }).slice(0, 2),
    [clubEvents, players, scoutBoard, season, storyState.cast, youthInbox],
  );

  const tablePlace = leagueTablePlace(league);
  const matchdayStrip = [
    formatCalendarWeekDisplay(week),
    matchdayLabel,
    nextOpponent ? `vs ${nextOpponent}` : null,
    tableRow ? `#${tablePlace} · ${t("hub.league.points", { points: tableRow.points })}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="pipeline club-shell-card-body">
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

      <div className="hub-cockpit-grid">
        <div className="hub-col-action">
          <HubActionColumn
            players={players}
            youthInbox={youthInbox}
            youthCamps={youthCamps}
            scoutBoard={scoutBoard}
            clubEvents={clubEvents}
            storyCast={storyState.cast}
            onOpenPostfach={onOpenPostfach}
            onStoryChoice={onStoryChoice}
            onViewAllEvents={onViewAllEvents}
            archivePreview={hubArchivePreview}
          />
        </div>

        <div className="hub-col-status">
          <p className="hub-col-label">{t("hub.column.status")}</p>
          <div className="hub-matchday-strip">
            <p className="hub-matchday-kicker">
              {formatSeasonDisplay(season)}
              {windowOpen ? ` · ${transferWindowDisplay(week)}` : ""}
              {lastResult
                ? ` · ${t("hub.lastMatch", { result: formatFixtureResult(lastResult, league.player_club_id) })}`
                : ""}
            </p>
            <p className="hub-matchday-main">{matchdayStrip}</p>
          </div>

          <div className="hub-modules-grid" aria-label={t("hub.actions")}>
            <button type="button" className="pipeline-tile" onClick={onOpenTraining}>
              <span
                className={`pipeline-light ${fatigueAmpelClassName(trainingLoad.ampel)}`}
                aria-hidden="true"
                title={trainingLoad.label}
              >
                {trainingLoad.icon}
              </span>
              <span>
                {t("hub.training.tile", { focus: focusCount, max: MAX_FOCUS_SLOTS })}
                {!planOk ? t("hub.training.planCheck") : ""}
              </span>
            </button>
            <button type="button" className="pipeline-tile" onClick={onOpenJugend}>
              <span className={`pipeline-light ${youthAmpelClass(youthInbox)}`} aria-hidden="true">
                {youthAmpelMark(youthInbox)}
              </span>
              <span>{youthTileLabel(youthInbox)}</span>
            </button>
            <button type="button" className="pipeline-tile" onClick={onOpenScouting}>
              <Eye size={18} aria-hidden="true" />
              <span>{t("hub.scouting.active", { count: activeScouts })}</span>
            </button>
            <button type="button" className="pipeline-tile" onClick={onOpenTransfers}>
              <ArrowLeftRight size={18} aria-hidden="true" />
              <span>{loanCount > 0 ? t("hub.loans.out", { count: loanCount }) : t("hub.loans")}</span>
            </button>
          </div>

          <PipelineFillCard fill={stageFill} onOpenJugend={onOpenJugend} />
          <GrowthHeatmap cells={heatCells} onSelectPlayer={onSelectPlayer} compact />
        </div>

        <div className="hub-col-context">
          <p className="hub-col-label">{t("hub.column.context")}</p>
          {showObjectives ? (
            <BoardObjectivesPanel board={board} league={league} finances={finances} season={season} />
          ) : null}
          <DevelopmentHubPanel movers={developmentMovers} onSelectPlayer={onSelectPlayer} />
          <ChroniclePanel entries={storyState.chronicle_entries} />
        </div>
      </div>
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
    return t("hub.youth.departure", { count: summary.departureRisks });
  }
  if (summary.pending > 0) {
    return t("hub.youth.open", { count: summary.pending });
  }
  return t("hub.youth.calm");
}
