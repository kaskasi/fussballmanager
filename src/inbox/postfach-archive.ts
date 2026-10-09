import type { ClubEvent } from "./club-events.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { ScoutJobCompleteNotice } from "../scouting/scout-job-postfach.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { StoryCast } from "../narrative/story-state.ts";
import { localizeStoryInbox } from "../i18n/story-display.ts";
import { t } from "../i18n/index.ts";
import {
  inboxItemLabel,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import { parseKickerItemId } from "./kicker-inbox.ts";

export type PostfachArchiveKind =
  | "club_event"
  | "scout_report"
  | "scout_discovery"
  | "scout_job"
  | "inbox_resolved"
  | "kicker_edition";

export type PostfachArchiveReopenRef =
  | { type: "club_event"; eventId: string }
  | { type: "scout_job"; noticeId: string }
  | { type: "inbox_item"; itemId: string }
  | { type: "kicker"; season: number; week: number };

export interface PostfachArchiveEntry {
  id: string;
  season: number;
  week: number;
  title: string;
  detail: string;
  kind: PostfachArchiveKind;
  playerId?: string;
  reopen: PostfachArchiveReopenRef;
}

export const POSTFACH_ARCHIVE_PAGE_SIZE = 6;

export function paginateArchiveEntries(
  entries: readonly PostfachArchiveEntry[],
  page: number,
  pageSize = POSTFACH_ARCHIVE_PAGE_SIZE,
): PostfachArchiveEntry[] {
  const safePage = Math.max(0, Math.floor(page));
  const start = safePage * pageSize;
  return entries.slice(start, start + pageSize);
}

function calendarKey(season: number, week: number): number {
  return season * 100 + week;
}

function oneLineEntry(
  partial: Omit<PostfachArchiveEntry, "title" | "detail"> & { line: string; detail?: string },
): PostfachArchiveEntry {
  const line = partial.line.trim();
  return {
    id: partial.id,
    season: partial.season,
    week: partial.week,
    kind: partial.kind,
    playerId: partial.playerId,
    reopen: partial.reopen,
    title: line,
    detail: partial.detail?.trim() ?? "",
  };
}

export function scoutJobDismissOneLiner(notice: ScoutJobCompleteNotice): string {
  if (notice.kind === "region_complete") {
    return t("postfach.archive.scoutReportClosed", {
      label: notice.zoneLabel ?? notice.zoneId ?? t("postfach.archive.fallbackRegion"),
    });
  }
  if (notice.kind === "opponent_scout_complete") {
    return t("postfach.archive.opponentReportDeleted", {
      opponent: notice.opponentShortName ?? t("postfach.archive.fallbackOpponent"),
    });
  }
  return t("postfach.archive.scoutReportClosed", {
    label: notice.clubName ?? notice.careerClubId ?? t("postfach.archive.fallbackClub"),
  });
}

function scoutJobArchiveLine(notice: ScoutJobCompleteNotice): PostfachArchiveEntry {
  let label: string;
  if (notice.kind === "region_complete") {
    label = notice.zoneLabel ?? notice.zoneId ?? "Region";
  } else if (notice.kind === "opponent_scout_complete") {
    label = notice.opponentShortName ?? "Gegner-Analyse";
  } else {
    label = notice.clubName ?? notice.careerClubId ?? "Verein";
  }
  return oneLineEntry({
    id: `archive-${notice.id}`,
    season: notice.season,
    week: notice.week,
    kind: "scout_job",
    reopen: { type: "scout_job", noticeId: notice.id },
    line: t("postfach.archive.scoutJobComplete", { label }),
  });
}

export function inboxResolvedArchiveEntry(
  item: DecisionInboxItem,
  season: number,
  players: readonly Player[],
  cast: StoryCast,
): PostfachArchiveEntry {
  const label = item.narrative
    ? localizeStoryInbox(item.narrative, cast).title
    : item.kind === "assistant_training_reminder"
      ? t("postfach.archive.trainingReminder")
      : inboxItemLabel(item, cast);
  const player = players.find((entry) => entry.id === item.playerId);
  const who = player ? formatPlayerName(player) : "";
  if (item.kind === "kicker_transfer") {
    const stamp = parseKickerItemId(item.id);
    const treterTitle = t("postfach.archive.treterEdition");
    return oneLineEntry({
      id: `inbox-${item.id}`,
      season: stamp?.season ?? season,
      week: stamp?.week ?? item.week,
      kind: "kicker_edition",
      reopen: {
        type: "kicker",
        season: stamp?.season ?? season,
        week: stamp?.week ?? item.week,
      },
      line: treterTitle,
    });
  }
  const line = who
    ? t("postfach.archive.resolvedWithPlayer", { label, who })
    : t("postfach.archive.resolved", { label });
  return oneLineEntry({
    id: `inbox-${item.id}`,
    season,
    week: item.week,
    kind: "inbox_resolved",
    playerId: item.playerId || undefined,
    reopen: { type: "inbox_item", itemId: item.id },
    line,
  });
}

function buildInboxResolvedArchive(input: {
  youthInbox?: YouthInboxState;
  players?: readonly Player[];
  season: number;
  storyCast?: StoryCast;
  clubEventMessages: ReadonlySet<string>;
}): PostfachArchiveEntry[] {
  if (!input.youthInbox || !input.players || !input.storyCast) return [];
  const entries: PostfachArchiveEntry[] = [];
  for (const itemId of input.youthInbox.resolvedIds) {
    const item = input.youthInbox.items.find((entry) => entry.id === itemId);
    if (!item) continue;
    const entry = inboxResolvedArchiveEntry(item, input.season, input.players, input.storyCast);
    if (input.clubEventMessages.has(entry.title)) continue;
    const duplicate = [...input.clubEventMessages].some(
      (message) => message.includes(entry.title.slice(0, 24)) || entry.title.includes(message.slice(0, 24)),
    );
    if (duplicate) continue;
    entries.push(entry);
  }
  return entries;
}

/** Hub feed, erledigte Postfach-Entscheidungen, Scout-Jobs (gelesen). */
export function buildPostfachArchive(input: {
  scoutBoard: ScoutBoard;
  clubEvents: readonly ClubEvent[];
  youthInbox?: YouthInboxState;
  players?: readonly Player[];
  season?: number;
  storyCast?: StoryCast;
}): PostfachArchiveEntry[] {
  const entries: PostfachArchiveEntry[] = [];
  const clubEventMessages = new Set(input.clubEvents.map((event) => event.message.trim()));

  for (const event of input.clubEvents) {
    entries.push(
      oneLineEntry({
        id: event.id,
        season: event.season,
        week: event.week,
        kind: "club_event",
        reopen: { type: "club_event", eventId: event.id },
        line: event.message,
        detail: event.message,
      }),
    );
  }

  if (input.season !== undefined) {
    entries.push(
      ...buildInboxResolvedArchive({
        youthInbox: input.youthInbox,
        players: input.players,
        season: input.season,
        storyCast: input.storyCast,
        clubEventMessages,
      }),
    );
  }

  for (const notice of input.scoutBoard.discovery_postfach_queue ?? []) {
    if (!notice.consumed) continue;
    const line = scoutJobArchiveLine(notice);
    if (clubEventMessages.has(line.title)) continue;
    entries.push(line);
  }

  const sorted = entries.sort(
    (a, b) => calendarKey(b.season, b.week) - calendarKey(a.season, a.week),
  );
  const seen = new Set<string>();
  return sorted.filter((entry) => {
    const key = `${entry.id}|${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
