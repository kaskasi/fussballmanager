import { useEffect, useState } from "react";
import { clubEventIcon, type ClubEvent } from "../../inbox/club-events.ts";
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
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";

/**
 * WIREFRAME: PRD 09.2 — Hub Inbox (decisions + scout reports)
 * ┌────────────────────────────────────────────────────────┐
 * │ 📥 Inbox · KW 12                                       │
 * ├──────────────────────┬─────────────────────────────────┤
 * │ 🚩 Entscheidungen    │ 👁️ Scout-Berichte               │
 * │ K. Müller · Vertrag  │ L. Santos · CA ~74 · ✅         │
 * └──────────────────────┴─────────────────────────────────┘
 */

const EVENTS_PER_PAGE = 4;

export function HubInboxPanel({
  week,
  players,
  youthInbox,
  scoutBoard,
  clubEvents,
  season,
  onOpenDecision,
  onSelectScoutTarget,
}: {
  week: number;
  season: number;
  players: readonly Player[];
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  clubEvents: readonly ClubEvent[];
  onOpenDecision: (itemId: string) => void;
  onSelectScoutTarget: (playerId: string) => void;
}) {
  const focus = inboxWeekFocus(youthInbox, players);
  const decisions = focus.open;
  const nextQueuedPlayer = focus.nextQueued
    ? players.find((entry) => entry.id === focus.nextQueued?.playerId)
    : undefined;
  const pipelineHint = inboxPipelineHint(
    focus,
    nextQueuedPlayer ? formatPlayerName(nextQueuedPlayer) : undefined,
  );
  const reports = scoutReportsForWeek(scoutBoard, week);
  const discoveries = discoveryAlertsForWeek(scoutBoard, week);
  const totalEventPages = Math.max(1, Math.ceil(clubEvents.length / EVENTS_PER_PAGE));
  const [eventPage, setEventPage] = useState(0);

  useEffect(() => {
    setEventPage((current) => Math.min(current, totalEventPages - 1));
  }, [totalEventPages]);

  const pageEvents = clubEvents.slice(
    eventPage * EVENTS_PER_PAGE,
    eventPage * EVENTS_PER_PAGE + EVENTS_PER_PAGE,
  );

  return (
    <section className="hub-inbox" aria-label="Inbox">
      <header className="hub-inbox-head">
        <h3>📥 Inbox</h3>
      </header>

      <div className="hub-inbox-columns">
        <div className="hub-inbox-column">
          <p className="hub-inbox-column-title">Entscheidungen</p>
          <p className="hub-inbox-focus-line">{inboxHeadline(focus)}</p>
          {pipelineHint ? <p className="hub-inbox-queue-note">{pipelineHint}</p> : null}
          {decisions.length === 0 ? (
            <p className="hub-inbox-empty">
              {focus.nextQueued && nextQueuedPlayer
                ? `${formatPlayerName(nextQueuedPlayer)} · ${inboxItemLabel(focus.nextQueued)} steht als Nächstes an.`
                : "Alles erledigt — neue Jugend-Hinweise kommen mit dem Spieltag."}
            </p>
          ) : (
            <ul className="hub-inbox-list">
              {decisions.map((item) => {
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
                            : "🤵";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="hub-inbox-row hub-inbox-row-story"
                        onClick={() => onOpenDecision(item.id)}
                      >
                        <span className="hub-inbox-icon" aria-hidden="true">{icon}</span>
                        <span className="hub-inbox-row-text">
                          <strong>{inboxItemLabel(item)}</strong>
                          <span className="hub-inbox-row-detail">
                            {item.narrative?.body.slice(0, 72)}
                            {(item.narrative?.body.length ?? 0) > 72 ? "…" : ""}
                          </span>
                        </span>
                        <span className="hub-inbox-row-cta">→</span>
                      </button>
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
                        <span className="hub-inbox-row-detail">{inboxItemLabel(item)}</span>
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
          <p className="hub-inbox-column-title">Scout-Berichte</p>
          {reports.length === 0 && discoveries.length === 0 ? (
            <p className="hub-inbox-empty">
              Noch keine Berichte diese Woche — Scout im Markt zuweisen und Woche simulieren.
            </p>
          ) : (
            <ul className="hub-inbox-list">
              {discoveries.map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    className="hub-inbox-row hub-inbox-row-discovery"
                    onClick={() => onSelectScoutTarget(alert.playerId)}
                  >
                    <span className="hub-inbox-icon" aria-hidden="true">🔔</span>
                    <span className="hub-inbox-row-text">
                      <strong>{alert.headline}</strong>
                      <span className="hub-inbox-row-detail">
                        {alert.playerName} · CA ~{alert.estimatedCa}
                      </span>
                    </span>
                    <span className="hub-inbox-row-cta">→</span>
                  </button>
                </li>
              ))}
              {reports.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    className="hub-inbox-row"
                    onClick={() => onSelectScoutTarget(report.playerId)}
                  >
                    <span className="hub-inbox-icon" aria-hidden="true">👁️</span>
                    <span className="hub-inbox-row-text">
                      <strong>{report.playerName}</strong>
                      <span className="hub-inbox-row-detail">
                        {report.position} · CA ~{report.estimatedCa} · {report.confidence}
                        {report.uncertaintyDelta < 0 ? " · schärfer" : ""}
                      </span>
                    </span>
                    <span className="hub-inbox-row-cta">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="hub-inbox-events">
        <p className="hub-inbox-column-title">Ereignisse</p>
        {clubEvents.length === 0 ? (
          <p className="hub-inbox-empty">Noch keine Club-Ereignisse — Transfers, Profil-Aktionen und Inbox landen hier.</p>
        ) : (
          <>
            <ul className="hub-inbox-list hub-inbox-list-events">
              {pageEvents.map((event) => (
                <li key={event.id}>
                  <div className="hub-inbox-event">
                    <span className="hub-inbox-icon" aria-hidden="true">{clubEventIcon(event.kind)}</span>
                    <span className="hub-inbox-event-message">{event.message}</span>
                    <span className="hub-inbox-event-meta">KW {event.week}</span>
                  </div>
                </li>
              ))}
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
