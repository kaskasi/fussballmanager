/** WIREFRAME: design.md §9.9 — Manager Desk hub (PRD 14.15) */
import { useMemo, useState } from "react";
import { buildHubTrainingWindow } from "../../hub/hub-training-window.ts";
import { hubCalendarBand } from "../../hub/hub-calendar-band.ts";
import {
  hubAttributeRollup,
  hubFitnessCells,
  hubPlayerGrowthCells,
} from "../../hub/hub-heatmaps.ts";
import { resolveHubCommerceFocus } from "../../hub/hub-finance-merch.ts";
import { hubLeagueSnippet } from "../../hub/hub-league-snippet.ts";
import { hubBlockerCount } from "../../hub/hub-blockers.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { Player } from "../../types/player.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import type { BoardState } from "../../board/board-state.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { YouthInboxState } from "../../youth/decision-inbox.ts";
import type { DecisionAction } from "../../youth/decision-inbox.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import { buildPostfachArchive } from "../../inbox/postfach-archive.ts";
import { listDevelopmentMovers } from "../../player/ca-tracking.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { HubActionColumn } from "../components/HubActionColumn.tsx";
import { BoardObjectivesPanel } from "../components/BoardObjectivesPanel.tsx";
import { DevelopmentHubPanel } from "../components/DevelopmentHubPanel.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";

export function ManagerDeskHub({
  session,
  players,
  trainingPlan,
  youthInbox,
  youthCamps,
  scoutBoard,
  clubEvents,
  storyState,
  league,
  finances,
  board,
  stadium,
  onOpenPostfach,
  onStoryChoice,
  onViewAllEvents,
  onSelectPlayer,
  onOpenTraining,
  onOpenScouting,
}: {
  session: GameSession;
  players: Player[];
  trainingPlan: TrainingSlot[];
  youthInbox: YouthInboxState;
  youthCamps: readonly YouthCamp[];
  scoutBoard: ScoutBoard;
  clubEvents: readonly ClubEvent[];
  storyState: StoryState;
  league: LeagueState;
  finances: ClubFinances;
  board: BoardState;
  stadium: ClubStadium;
  onOpenPostfach: (itemId?: string) => void;
  onStoryChoice: (itemId: string, action: DecisionAction) => void;
  onViewAllEvents: () => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenTraining: () => void;
  onOpenScouting: () => void;
}) {
  useT();
  const [wildcard, setWildcard] = useState<"board" | "league">("board");
  const [devPeriod, setDevPeriod] = useState<"week" | "month" | "year">("week");

  const { season, week, weekday, clubId } = session;

  const trainingWindow = useMemo(
    () => buildHubTrainingWindow(session, trainingPlan),
    [session, trainingPlan],
  );
  const calendarBand = useMemo(() => hubCalendarBand(session), [session]);
  const growthCells = useMemo(
    () => hubPlayerGrowthCells(players, clubId, season, week),
    [players, clubId, season, week],
  );
  const attributeRollup = useMemo(
    () => hubAttributeRollup(players, clubId, season, week),
    [players, clubId, season, week],
  );
  const fitnessCells = useMemo(() => hubFitnessCells(players, clubId), [players, clubId]);
  const commerce = useMemo(
    () => resolveHubCommerceFocus(finances, board, stadium),
    [finances, board, stadium],
  );
  const leagueSnippet = useMemo(() => hubLeagueSnippet(league), [league]);
  const developmentMovers = useMemo(
    () => listDevelopmentMovers(players, clubId),
    [players, clubId],
  );
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

  const blockers = hubBlockerCount({ session, youthInbox, players });

  return (
    <main className="manager-desk club-shell-card-body" data-hub-blockers={blockers}>
      <div className="manager-desk__inbox">
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

      <div className="manager-desk__wildcard">
        <div className="manager-desk__wildcard-tabs">
          <button
            type="button"
            className={`manager-desk__wildcard-tab${wildcard === "board" ? " is-active" : ""}`}
            onClick={() => setWildcard("board")}
          >
            {t("hub.column.context")}
          </button>
          <button
            type="button"
            className={`manager-desk__wildcard-tab${wildcard === "league" ? " is-active" : ""}`}
            onClick={() => setWildcard("league")}
          >
            {t("shell.nav.leagues")}
          </button>
        </div>
        {wildcard === "board" && board.objectives.length > 0 ? (
          <BoardObjectivesPanel
            board={board}
            league={league}
            finances={finances}
            season={season}
            players={players}
            clubId={clubId}
            youthCamps={youthCamps}
          />
        ) : null}
        {wildcard === "league" ? (
          <ul className="manager-desk__league-snippet">
            {leagueSnippet.map((row) => (
              <li key={row.teamId} className={row.isPlayerClub ? "is-you" : undefined}>
                #{row.place} {row.shortName} · {row.points}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="manager-desk__center-top">
        <div className="manager-desk__calendar-band">
          {calendarBand.length === 0 ? (
            <span className="manager-desk__calendar-chip">{t("hub.column.status")}</span>
          ) : (
            calendarBand.map((chip) => (
              <span key={chip.id} className="manager-desk__calendar-chip" title={chip.label}>
                {chip.shortLabel}
              </span>
            ))
          )}
        </div>
        <div className="manager-desk__training-strip">
          {trainingWindow.map((day) => (
            <div
              key={day.offset}
              className={`manager-desk__training-day${day.offset === 0 ? " is-today" : ""}`}
            >
              <div className="manager-desk__training-day-head">
                <span>{day.weekdayLabel}</span>
                {day.offset === 0 ? (
                  <button type="button" className="link-btn" onClick={onOpenTraining}>
                    {t("shell.nav.training")}
                  </button>
                ) : null}
              </div>
              {day.isMatchPreview && day.opponentShortName ? (
                <div className="manager-desk__match-preview">
                  <span>{day.opponentShortName}</span>
                  <button type="button" className="link-btn" onClick={onOpenScouting}>
                    {t("shell.nav.scouting")}
                  </button>
                </div>
              ) : (
                day.slots.map((slot, index) => (
                  <div
                    key={`${day.offset}-${index}`}
                    className={`manager-desk__slot${slot.focus ? " is-focus" : ""}`}
                  >
                    {slot.label}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="manager-desk__heatmaps">
        <div className="manager-desk__heatmap-panel">
          <p className="manager-desk__heatmap-title">Growth</p>
          <GrowthHeatmap cells={growthCells} onSelectPlayer={onSelectPlayer} compact />
        </div>
        <div className="manager-desk__heatmap-panel">
          <p className="manager-desk__heatmap-title">Attribute</p>
          <ul>
            {attributeRollup.map((row) => (
              <li key={row.group}>
                {row.label}: {row.totalDelta >= 0 ? "+" : ""}
                {row.totalDelta}
              </li>
            ))}
          </ul>
        </div>
        <div className="manager-desk__heatmap-panel">
          <p className="manager-desk__heatmap-title">Fitness</p>
          <div className="manager-desk__fitness-grid">
            {fitnessCells.slice(0, 22).map((cell) => (
              <span
                key={cell.playerId}
                title={`${cell.initials} ${cell.fitness}`}
                className={`heat-pixel is-${cell.tone}`}
              >
                {cell.fitness}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="manager-desk__side-stack">
        <div className="manager-desk__dev-pills">
          {(["week", "month", "year"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={`manager-desk__wildcard-tab${devPeriod === period ? " is-active" : ""}`}
              onClick={() => setDevPeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
        <DevelopmentHubPanel movers={developmentMovers} onSelectPlayer={onSelectPlayer} />
      </div>

      <div
        className={`manager-desk__commerce${commerce.mode === "finance_crisis" ? " is-crisis" : ""}`}
      >
        {commerce.mode === "finance_crisis" ? (
          <>
            <strong>{t("finances.cash")}</strong>: {formatClubCash(commerce.cash)} · Floor{" "}
            {formatClubCash(commerce.boardFloor)}
          </>
        ) : (
          <>
            <strong>Merch</strong>
            {commerce.merchAlerts.length === 0 ? (
              <span> — OK</span>
            ) : (
              <ul>
                {commerce.merchAlerts.map((alert) => (
                  <li key={alert.sku}>
                    {alert.label}: {alert.stock}
                    {alert.pendingOrder ? " (bestellt)" : ""}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
