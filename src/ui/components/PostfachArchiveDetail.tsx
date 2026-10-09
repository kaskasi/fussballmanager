/** WIREFRAME: design.md §9.4 — Archiv-Eintrag wieder öffnen (gelesen, nicht gelöscht) */
import { X } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { scoutJobNoticeByIdAny } from "../../scouting/scout-job-postfach.ts";
import type { PostfachArchiveEntry } from "../../inbox/postfach-archive.ts";
import { sessionKickerEditionLookup } from "../../inbox/kicker-edition-archive.ts";
import type { TreterEdition } from "../../media/kicker-digest.ts";
import {
  inboxItemLabel,
  isStoryInboxItem,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { localizeStoryInbox } from "../../i18n/story-display.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";
import { KickerInboxCard } from "./KickerInboxCard.tsx";
import { ScoutJobInboxCard } from "./ScoutJobInboxCard.tsx";
import { OpponentScoutInboxCard } from "./OpponentScoutInboxCard.tsx";

export function PostfachArchiveDetail({
  entry,
  onClose,
  inbox,
  players,
  storyCast,
  clubEvents,
  scoutBoard,
  kickerEditionArchive,
  kickerEditionCurrent,
  onSelectPlayer,
}: {
  entry: PostfachArchiveEntry;
  onClose: () => void;
  inbox: YouthInboxState;
  players: readonly Player[];
  storyCast: StoryCast;
  clubEvents: readonly ClubEvent[];
  scoutBoard?: ScoutBoard;
  kickerEditionArchive: readonly TreterEdition[];
  kickerEditionCurrent?: TreterEdition | null;
  onSelectPlayer?: (playerId: string) => void;
}) {
  useT();

  const body = (() => {
    const ref = entry.reopen;
    switch (ref.type) {
      case "club_event": {
        const event = clubEvents.find((row) => row.id === ref.eventId);
        if (!event) {
          return <p>{t("postfach.archive.reopenMissing")}</p>;
        }
        return (
          <section className="inbox-detail inbox-archive-readonly">
            <p className="inbox-archive-event-message">{event.message}</p>
          </section>
        );
      }
      case "kicker": {
        const edition = sessionKickerEditionLookup(
          kickerEditionArchive,
          kickerEditionCurrent,
          ref.season,
          ref.week,
        );
        if (!edition) {
          return <p>{t("postfach.archive.treterMissing")}</p>;
        }
        return (
          <KickerInboxCard
            edition={edition}
            postIndex={1}
            postTotal={1}
            readOnly
            onSelectPlayer={onSelectPlayer}
            compact
          />
        );
      }
      case "scout_job": {
        const notice = scoutBoard ? scoutJobNoticeByIdAny(scoutBoard, ref.noticeId) : undefined;
        if (!notice) {
          return <p>{t("postfach.archive.reopenMissing")}</p>;
        }
        if (notice.kind === "opponent_scout_complete" && notice.report) {
          return (
            <OpponentScoutInboxCard
              notice={notice}
              postIndex={1}
              postTotal={1}
              embedded
              readOnly
              onDismiss={() => undefined}
            />
          );
        }
        return (
          <ScoutJobInboxCard
            notice={notice}
            postIndex={1}
            postTotal={1}
            readOnly
            onDismiss={() => undefined}
          />
        );
      }
      case "inbox_item": {
        const item = inbox.items.find((row) => row.id === ref.itemId);
        if (!item) {
          return <p>{t("postfach.archive.reopenMissing")}</p>;
        }
        const player = item.playerId ? players.find((row) => row.id === item.playerId) : undefined;
        if (isStoryInboxItem(item) && item.narrative) {
          const story = localizeStoryInbox(item.narrative, storyCast);
          return (
            <section className="inbox-detail inbox-archive-readonly inbox-card-story">
              <strong>{story.title}</strong>
              <p>{story.body}</p>
            </section>
          );
        }
        return (
          <section className="inbox-detail inbox-archive-readonly">
            <p>
              <strong>{inboxItemLabel(item, storyCast)}</strong>
            </p>
            {player ? <p>{formatPlayerName(player)}</p> : null}
            <p className="inbox-archive-readonly-note">{t("postfach.archive.readOnlyNote")}</p>
          </section>
        );
      }
      default:
        return null;
    }
  })();

  return (
    <section className="postfach-archive-detail game-panel" aria-label={t("postfach.archive.detailAria")}>
      <header className="postfach-archive-detail-head">
        <h3>{entry.title}</h3>
        <button type="button" className="inbox-close" onClick={onClose} aria-label={t("postfach.archive.closeDetail")}>
          <X size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </header>
      {body}
    </section>
  );
}
