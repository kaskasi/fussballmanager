/** WIREFRAME: design.md §9.9 — Manager Desk hub (PRD 14.15) */
import { useMemo, useState } from "react";
import type { CalendarMilestone } from "../calendar/calendar-milestones.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { hubFitnessCells, hubPlayerGrowthCells } from "../../hub/hub-heatmaps.ts";
import { buildHubMerchDeskView, resolveHubCommerceFocus } from "../../hub/hub-finance-merch.ts";
import { HubMerchDeskPanel } from "../components/HubMerchDeskPanel.tsx";
import { hubLeagueSnippet } from "../../hub/hub-league-snippet.ts";
import { listHubBlockers, type HubBlockerKind } from "../../hub/hub-blockers.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { Player } from "../../types/player.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import type { BoardState } from "../../board/board-state.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import { listDevelopmentMovers } from "../../player/ca-tracking.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { BoardObjectivesPanel } from "../components/BoardObjectivesPanel.tsx";
import { DevelopmentHubPanel } from "../components/DevelopmentHubPanel.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";
import { AttributeTrainingHeatmap } from "../components/AttributeTrainingHeatmap.tsx";
import { SquadFitnessHeatmap } from "../components/SquadFitnessHeatmap.tsx";
import { HubThreeDayTrainingCalendar } from "../components/HubThreeDayTrainingCalendar.tsx";
import { DecisionInboxPanel } from "../components/DecisionInboxPanel.tsx";
import type { PostfachPanelProps } from "./postfach-panel-props.ts";
import { usesTrainingNextNexus } from "../../sim/training-next.ts";
import { hubLatestTreterEdition, treterTickerLines } from "../../hub/hub-treter-ticker.ts";
import { HubTreterTicker } from "../components/HubTreterTicker.tsx";

export function ManagerDeskHub({
  session,
  players,
  trainingPlan,
  league,
  finances,
  board,
  stadium,
  onOpenTraining,
  onOpenScouting,
  onSelectPlayer,
  postfach,
  calendarMilestones = [],
  scoutBoard,
}: {
  session: GameSession;
  players: Player[];
  trainingPlan: TrainingSlot[];
  league: LeagueState;
  finances: ClubFinances;
  board: BoardState;
  stadium: ClubStadium;
  onOpenTraining: () => void;
  onOpenScouting: () => void;
  onSelectPlayer: (playerId: string) => void;
  postfach: PostfachPanelProps;
  calendarMilestones?: readonly CalendarMilestone[];
  scoutBoard?: ScoutBoard;
}) {
  useT();
  const [wildcard, setWildcard] = useState<"board" | "league">("board");
  const [devPeriod, setDevPeriod] = useState<"week" | "month" | "year">("week");

  const { season, week, clubId, trainingUnitsCompleted } = session;

  const growthCells = useMemo(
    () => hubPlayerGrowthCells(players, clubId, season, week),
    [players, clubId, season, week],
  );
  const fitnessCells = useMemo(() => hubFitnessCells(players, clubId), [players, clubId]);
  const commerce = useMemo(
    () => resolveHubCommerceFocus(finances, board, stadium),
    [finances, board, stadium],
  );
  const merchDesk = useMemo(() => buildHubMerchDeskView(stadium), [stadium]);
  const leagueSnippet = useMemo(() => hubLeagueSnippet(league), [league]);
  const developmentMovers = useMemo(
    () => listDevelopmentMovers(players, clubId),
    [players, clubId],
  );

  const hubBlockers = useMemo(
    () => listHubBlockers({ session, youthInbox: postfach.youthInbox, players }),
    [session, postfach.youthInbox, players],
  );
  const blockers = hubBlockers.length;

  const blockerLabel = (kind: HubBlockerKind): string => t(`hub.desk.blocker.${kind}`);

  const treterTickerLinesResolved = useMemo(() => {
    const edition = hubLatestTreterEdition({
      current: postfach.kickerEdition,
      archive: postfach.kickerEditionArchive,
      session: postfach.treterSession ?? session,
    });
    return edition ? treterTickerLines(edition) : [];
  }, [postfach.kickerEdition, postfach.kickerEditionArchive, postfach.treterSession, session]);

  return (
    <main className="manager-desk club-shell-card-body" data-hub-blockers={blockers}>
      <div className="manager-desk__inbox">
        <section className="game-panel postfach-decisions manager-desk__postfach" aria-label={t("postfach.open.panelAria")}>
          <div className="manager-desk__postfach-scroll">
          <DecisionInboxPanel
            inbox={postfach.youthInbox}
            onDecision={postfach.onDecision}
            players={postfach.players}
            clubId={postfach.clubId}
            season={postfach.season}
            week={postfach.week}
            storyCast={postfach.storyCast}
            initialItemId={postfach.initialItemId}
            onSelectPlayer={postfach.onSelectPlayer}
            youthCamps={postfach.youthCamps}
            masterSeed={postfach.masterSeed}
            onHireCampLeader={postfach.onHireCampLeader}
            orthopedistHire={postfach.orthopedistHire}
            hasOrthopedist={postfach.hasOrthopedist}
            onHireOrthopedist={postfach.onHireOrthopedist}
            scoutBoard={postfach.scoutBoard}
            onDismissScoutJob={postfach.onDismissScoutJob}
            onOpenScoutingNetwork={postfach.onOpenScoutingNetwork}
            onOpenScoutingHits={postfach.onOpenScoutingHits}
            onApplyOpponentScoutPlan={postfach.onApplyOpponentScoutPlan}
            clubEvents={postfach.clubEvents}
            kickerEdition={postfach.kickerEdition}
            kickerEditionArchive={postfach.kickerEditionArchive}
            transferHistory={postfach.transferHistory}
            rivalPlayers={postfach.rivalPlayers}
            worldClubs={postfach.worldClubs}
            treterSession={postfach.treterSession}
            layout="hub"
            onOpenPostfach={postfach.onOpenPostfach}
          />
          </div>
        </section>
      </div>

      <aside className="manager-desk__sidebar">
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
              youthCamps={postfach.youthCamps}
            />
          ) : null}
          {wildcard === "league" ? (
            <div className="manager-desk__league-panel">
              <table className="manager-desk__league-table">
                <thead>
                  <tr>
                    <th scope="col">{t("hub.desk.leagueColPlace")}</th>
                    <th scope="col">{t("hub.desk.leagueColClub")}</th>
                    <th scope="col">{t("hub.desk.leagueColPts")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueSnippet.map((row) => (
                    <tr key={row.teamId} className={row.isPlayerClub ? "is-you" : undefined}>
                      <td>{row.place}</td>
                      <td>{row.shortName}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div
          className={`manager-desk__commerce${commerce.mode === "finance_crisis" ? " is-crisis" : ""}`}
        >
          {commerce.mode === "finance_crisis" ? (
            <>
              <strong>{t("hub.desk.cash")}</strong>: {formatClubCash(commerce.cash)} ·{" "}
              {t("hub.desk.boardFloor")} {formatClubCash(commerce.boardFloor)}
            </>
          ) : merchDesk ? (
            <HubMerchDeskPanel view={merchDesk} />
          ) : (
            <p className="hub-merch-desk__fallback">{t("hub.desk.merchOk")}</p>
          )}
        </div>
      </aside>

      <div className="manager-desk__center">
        <HubTreterTicker lines={treterTickerLinesResolved} />
        <HubThreeDayTrainingCalendar
          session={session}
          plan={trainingPlan}
          useTrainingUnitProgress={usesTrainingNextNexus(session.storyState)}
          milestones={calendarMilestones}
          scoutBoard={scoutBoard ?? postfach.scoutBoard}
          onOpenTraining={onOpenTraining}
          onOpenScouting={onOpenScouting}
        />
      </div>

      <div className="manager-desk__bottom">
        <div className={`manager-desk__duty${blockers > 0 ? " is-alert" : ""}`}>
          <p className="manager-desk__duty-title">{t("hub.desk.dutyTitle")}</p>
          {hubBlockers.length === 0 ? (
            <p className="manager-desk__duty-clear">{t("hub.desk.dutyClear")}</p>
          ) : (
            <ul className="manager-desk__duty-list">
              {hubBlockers.map((blocker) => (
                <li key={blocker.id}>{blockerLabel(blocker.kind)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="manager-desk__heatmaps training-schedule-heatmap">
          <GrowthHeatmap
            cells={growthCells}
            onSelectPlayer={onSelectPlayer}
            compact
            mode="weekSoFar"
          />
          <AttributeTrainingHeatmap
            players={players}
            clubId={clubId}
            season={season}
            week={week}
            trainingUnitsCompleted={trainingUnitsCompleted}
            compact
          />
          <SquadFitnessHeatmap cells={fitnessCells} onSelectPlayer={onSelectPlayer} compact />
        </div>

        <div className="manager-desk__development">
          <div className="manager-desk__dev-pills">
            {(["week", "month", "year"] as const).map((period) => (
              <button
                key={period}
                type="button"
                className={`manager-desk__wildcard-tab${devPeriod === period ? " is-active" : ""}`}
                onClick={() => setDevPeriod(period)}
              >
                {t(`hub.desk.period.${period}`)}
              </button>
            ))}
          </div>
          <DevelopmentHubPanel
            movers={developmentMovers}
            onSelectPlayer={onSelectPlayer}
            variant="desk"
            period={devPeriod}
            players={players}
            season={season}
          />
        </div>
      </div>
    </main>
  );
}
