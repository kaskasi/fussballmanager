/**
 * WIREFRAME: docs/prd/design.md §9.9 — Hub Aktion column (decisions, post, events)
 */
import { AlertTriangle, Mail } from "lucide-react";
import type { ClubEvent } from "../../inbox/club-events.ts";
import { clubEventIcon } from "../../inbox/club-events.ts";
import { postfachOpenCount } from "../../inbox/postfach-open-count.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
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
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";
import { campsAwaitingLeaderChoice } from "../../youth/camp-leader-hire.ts";
import { campLeaderPostfachItemId } from "../../inbox/postfach-camp-leader.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { localizeStoryInbox } from "../../i18n/story-display.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { InboxStanceButtons } from "./InboxStanceButtons.tsx";

const HUB_EVENTS_PREVIEW = 4;

export function HubActionColumn({
  players,
  youthInbox,
  youthCamps,
  clubEvents,
  storyCast,
  onOpenPostfach,
  onStoryChoice,
  onViewAllEvents,
  scoutBoard,
}: {
  players: readonly Player[];
  youthInbox: YouthInboxState;
  youthCamps: readonly YouthCamp[];
  scoutBoard?: ScoutBoard;
  clubEvents: readonly ClubEvent[];
  storyCast: StoryCast;
  onOpenPostfach: (itemId?: string) => void;
  onStoryChoice: (itemId: string, action: DecisionAction) => void;
  onViewAllEvents: () => void;
}) {
  useT();
  const focus = inboxWeekFocus(youthInbox, players);
  const decisions = focus.open.slice(0, MAX_INBOX_ITEMS);
  const postfachCount = postfachOpenCount(youthInbox, players, youthCamps, scoutBoard);
  const nextQueuedPlayer = focus.nextQueued
    ? players.find((entry) => entry.id === focus.nextQueued?.playerId)
    : undefined;
  const pipelineHint = inboxPipelineHint(
    focus,
    nextQueuedPlayer ? formatPlayerName(nextQueuedPlayer) : undefined,
  );
  const previewEvents = clubEvents.slice(0, HUB_EVENTS_PREVIEW);
  const campLeaderMail = campsAwaitingLeaderChoice(youthCamps);

  return (
    <div className="hub-action-column">
      <p className="hub-col-label">{t("hub.column.action")}</p>

      <section className="design-panel hub-decisions-panel" aria-label={t("hub.inbox.decisions")}>
        <header className="hub-decisions-head">
          <AlertTriangle size={18} aria-hidden="true" />
          <strong>{inboxHeadline(focus)}</strong>
        </header>
        {pipelineHint ? <p className="hub-inbox-queue-note">{pipelineHint}</p> : null}
        {decisions.length === 0 && postfachCount === 0 ? (
          <p className="hub-inbox-empty">
            {focus.nextQueued && nextQueuedPlayer
              ? t("hub.inbox.decisionsNext", {
                  name: formatPlayerName(nextQueuedPlayer),
                  label: inboxItemLabel(focus.nextQueued, storyCast),
                })
              : t("hub.inbox.decisionsEmpty")}
          </p>
        ) : (
          <ul className="hub-inbox-list">
            {decisions.map((item) => {
              if (isStoryInboxItem(item)) {
                return (
                  <li key={item.id}>
                    <article className="hub-post" aria-label={item.narrative?.title ?? "Post"}>
                      <p className="hub-post-title">{inboxItemLabel(item, storyCast)}</p>
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
                    onClick={() => onOpenPostfach(item.id)}
                  >
                    <span className="hub-inbox-row-text">
                      <strong>{formatPlayerName(player)}</strong>
                      <span className="hub-inbox-row-detail">{inboxItemLabel(item, storyCast)}</span>
                    </span>
                    <span className="hub-inbox-row-cta" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              );
            })}
            {campLeaderMail.map((camp) => {
              const nation = campNationById(camp.id);
              const itemId = campLeaderPostfachItemId(camp.id);
              return (
                <li key={itemId}>
                  <button
                    type="button"
                    className="hub-inbox-row"
                    onClick={() => onOpenPostfach(itemId)}
                  >
                    <span className="hub-inbox-row-text">
                      <strong>{nation?.label ?? camp.id}</strong>
                      <span className="hub-inbox-row-detail">Camp-Leiter · Kandidaten</span>
                    </span>
                    <span className="hub-inbox-row-cta" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="design-panel hub-post-summary"
        onClick={() => onOpenPostfach()}
        disabled={postfachCount === 0}
      >
        <Mail size={18} aria-hidden="true" />
        <span>
          {t("shell.nav.postfach")}
          {postfachCount > 0 ? ` · ${postfachCount}` : ""}
        </span>
      </button>

      <section className="design-panel hub-events-preview" aria-label={t("hub.inbox.events")}>
        <header className="hub-events-preview-head">
          <strong>{t("hub.inbox.events")}</strong>
          {clubEvents.length > HUB_EVENTS_PREVIEW ? (
            <button type="button" className="hub-events-all-link" onClick={onViewAllEvents}>
              {t("hub.events.all", { count: clubEvents.length })}
            </button>
          ) : null}
        </header>
        {clubEvents.length === 0 ? (
          <p className="hub-inbox-empty">{t("hub.inbox.eventsEmpty")}</p>
        ) : (
          <ul className="hub-inbox-list hub-inbox-list-events">
            {previewEvents.map((event) => (
              <li key={event.id}>
                <div className="hub-inbox-event">
                  <span className="hub-inbox-icon" aria-hidden="true">
                    {clubEventIcon(event.kind)}
                  </span>
                  <span className="hub-inbox-event-message">{event.message}</span>
                  <span className="hub-inbox-event-meta">{formatCalendarWeekDisplay(event.week)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
