import { useEffect, useState } from "react";
import { clubEventIcon, type ClubEvent } from "../../inbox/club-events.ts";
import { splitInboxEmojiPrefix } from "../../inbox/postfach-emoji.ts";
import { PostfachMessageText } from "./PostfachMessageText.tsx";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  discoveryAlertsForWeek,
  scoutReportsForWeek,
  type ScoutBoard,
} from "../../scouting/scout-board.ts";
import {
  inboxHeadline,
  inboxItemLabel,
  inboxPipelineHint,
  inboxWeekFocus,
  isStoryInboxItem,
  MAX_INBOX_ITEMS,
  type DecisionAction,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { localizeStoryInbox } from "../../i18n/story-display.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { polishClubEventMessage } from "../../transfers/transfer-history.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { InboxStanceButtons } from "./InboxStanceButtons.tsx";

/**
 * WIREFRAME: PRD 14.5 — Post
 * ┌─────────────────────────────────────────────┐
 * │ Post · 1/4                                  │
 * │ 📋 Vorstand · Klassenerhalt                 │
 * │ [● Überleben]   [▲ Anspruch]                │
 * └─────────────────────────────────────────────┘
 */

const EVENTS_PER_PAGE = 4;
const SCOUT_PER_PAGE = 4;

export function HubInboxPanel({
  week,
  players,
  youthInbox,
  scoutBoard,
  clubEvents,
  season,
  onOpenDecision,
  onStoryChoice,
  onSelectScoutTarget,
  storyCast,
  worldClubs,
}: {
  week: number;
  season: number;
  storyCast: StoryCast;
  players: readonly Player[];
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  clubEvents: readonly ClubEvent[];
  onOpenDecision: (itemId: string) => void;
  onStoryChoice: (itemId: string, action: DecisionAction) => void;
  onSelectScoutTarget: (playerId: string) => void;
  worldClubs?: readonly WorldClub[];
}) {
  useT();
  const focus = inboxWeekFocus(youthInbox, players);
  const decisions = focus.open;
  const pipelineHint = inboxPipelineHint(focus);
  const reports = scoutReportsForWeek(scoutBoard, week);
  const discoveries = discoveryAlertsForWeek(scoutBoard, week);
  const scoutRows = [
    ...discoveries.map((alert) => ({ kind: "discovery" as const, id: alert.id, alert })),
    ...reports.map((report) => ({ kind: "report" as const, id: report.id, report })),
  ];
  const totalEventPages = Math.max(1, Math.ceil(clubEvents.length / EVENTS_PER_PAGE));
  const totalScoutPages = Math.max(1, Math.ceil(scoutRows.length / SCOUT_PER_PAGE));
  const [eventPage, setEventPage] = useState(0);
  const [scoutPage, setScoutPage] = useState(0);

  useEffect(() => {
    setEventPage((current) => Math.min(current, totalEventPages - 1));
  }, [totalEventPages]);

  useEffect(() => {
    setScoutPage(0);
  }, [week]);

  useEffect(() => {
    setScoutPage((current) => Math.min(current, totalScoutPages - 1));
  }, [totalScoutPages]);

  const pageEvents = clubEvents.slice(
    eventPage * EVENTS_PER_PAGE,
    eventPage * EVENTS_PER_PAGE + EVENTS_PER_PAGE,
  );
  const pageScoutRows = scoutRows.slice(
    scoutPage * SCOUT_PER_PAGE,
    scoutPage * SCOUT_PER_PAGE + SCOUT_PER_PAGE,
  );

  return (
    <section className="hub-inbox" aria-label={t("hub.inbox.aria")}>
      <header className="hub-inbox-head">
        <h3>{t("hub.inbox.title", { current: decisions.length, max: MAX_INBOX_ITEMS })}</h3>
      </header>

      <div className="hub-inbox-columns">
        <div className="hub-inbox-column">
          <p className="hub-inbox-column-title">{t("hub.inbox.decisions")}</p>
          <p className="hub-inbox-focus-line">{inboxHeadline(focus)}</p>
          {pipelineHint ? <p className="hub-inbox-queue-note">{pipelineHint}</p> : null}
          {decisions.length === 0 ? (
            <p className="hub-inbox-empty">{t("hub.inbox.decisionsEmpty")}</p>
          ) : (
            <ul className="hub-inbox-list">
              {decisions.map((item, index) => {
                if (isStoryInboxItem(item)) {
                  const icon =
                    item.kind === "story_press"
                      ? "📰"
                      : item.kind === "story_fan"
                        ? "👥"
                        : item.kind === "story_captain"
                          ? "©️"
                          : item.kind === "story_assistant"
                            ? "🧑‍🏫"
                            : "📋";
                  return (
                    <li key={item.id}>
                      <article className="hub-post" aria-label={item.narrative?.title ?? "Post"}>
                        <p className="hub-post-count">
                          {t("hub.inbox.postItem", { index: index + 1, total: decisions.length })}
                        </p>
                        <p className="hub-post-title">
                          <span aria-hidden="true">{icon}</span> {inboxItemLabel(item, storyCast)}
                        </p>
                        {item.narrative ? (
                          <p className="hub-post-body">
                            {localizeStoryInbox(item.narrative, storyCast).body}
                          </p>
                        ) : null}
                        <InboxStanceButtons
                          item={item}
                          storyCast={storyCast}
                          onChoose={(action) => onStoryChoice(item.id, action)}
                        />
                      </article>
                    </li>
                  );
                }
                const player = players.find((entry) => entry.id === item.playerId);
                if (!player) return null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="hub-inbox-row"
                      onClick={() => onOpenDecision(item.id)}
                    >
                      <span className="hub-inbox-icon" aria-hidden="true">
                        {item.kind === "departure_risk" ? "🚩" : item.kind === "contract_offer" ? "✍️" : "⚠️"}
                      </span>
                      <span className="hub-inbox-row-text">
                        <strong>{formatPlayerName(player)}</strong>
                        <span className="hub-inbox-row-detail">{inboxItemLabel(item, storyCast)}</span>
                      </span>
                      <span className="hub-inbox-row-cta">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hub-inbox-column">
          <p className="hub-inbox-column-title">
            {t("hub.inbox.scoutReports")}
            {scoutRows.length > 0 ? ` · ${scoutRows.length}` : ""}
          </p>
          {scoutRows.length === 0 ? (
            <p className="hub-inbox-empty">{t("hub.inbox.scoutEmpty")}</p>
          ) : (
            <>
              <ul className="hub-inbox-list">
                {pageScoutRows.map((row) =>
                  row.kind === "discovery" ? (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="hub-inbox-row hub-inbox-row-discovery"
                        onClick={() => onSelectScoutTarget(row.alert.playerId)}
                      >
                        <span className="hub-inbox-icon" aria-hidden="true">🔔</span>
                        <span className="hub-inbox-row-text">
                          <strong>{row.alert.headline}</strong>
                          <span className="hub-inbox-row-detail">
                            {row.alert.playerName} · CA ~{row.alert.estimatedCa}
                          </span>
                        </span>
                        <span className="hub-inbox-row-cta">→</span>
                      </button>
                    </li>
                  ) : (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="hub-inbox-row"
                        onClick={() => onSelectScoutTarget(row.report.playerId)}
                      >
                        <span className="hub-inbox-icon" aria-hidden="true">👁️</span>
                        <span className="hub-inbox-row-text">
                          <strong>{row.report.playerName}</strong>
                          <span className="hub-inbox-row-detail">
                            {row.report.position} · CA ~{row.report.estimatedCa} · {row.report.confidence}
                            {row.report.uncertaintyDelta < 0 ? " · schärfer" : ""}
                          </span>
                        </span>
                        <span className="hub-inbox-row-cta">→</span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
              {totalScoutPages > 1 ? (
                <nav className="hub-inbox-events-pagination" aria-label="Scout-Berichte Seiten">
                  {Array.from({ length: totalScoutPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={index === scoutPage ? "hub-inbox-page is-active" : "hub-inbox-page"}
                      aria-current={index === scoutPage ? "page" : undefined}
                      onClick={() => setScoutPage(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="hub-inbox-events">
        <p className="hub-inbox-column-title">{t("hub.inbox.events")}</p>
        {clubEvents.length === 0 ? (
          <p className="hub-inbox-empty">{t("hub.inbox.eventsEmpty")}</p>
        ) : (
          <>
            <ul className="hub-inbox-list hub-inbox-list-events">
              {pageEvents.map((event) => {
                const eventText = polishClubEventMessage(event.message, players, worldClubs);
                const { emoji: leadingEmoji } = splitInboxEmojiPrefix(eventText);
                return (
                <li key={event.id}>
                  <div className="hub-inbox-event">
                    {!leadingEmoji ? (
                      <span className="hub-inbox-icon" aria-hidden="true">
                        {clubEventIcon(event.kind)}
                      </span>
                    ) : null}
                    <span className="hub-inbox-event-message">
                      <PostfachMessageText text={eventText} />
                    </span>
                    <span className="hub-inbox-event-meta">{formatCalendarWeekDisplay(event.week)}</span>
                  </div>
                </li>
              );
              })}
            </ul>
            {totalEventPages > 1 ? (
              <nav className="hub-inbox-events-pagination" aria-label="Ereignisse Seiten">
                {Array.from({ length: totalEventPages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index === eventPage ? "hub-inbox-page is-active" : "hub-inbox-page"}
                    aria-current={index === eventPage ? "page" : undefined}
                    onClick={() => setEventPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            ) : null}
          </>
        )}
      </div>

    </section>
  );
}
