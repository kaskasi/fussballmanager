import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { StoryCast } from "../narrative/story-state.ts";
import {
  inboxItemLabel,
  isStoryInboxItem,
  type DecisionInboxItem,
} from "../youth/decision-inbox.ts";
import { localizeStoryInbox } from "../i18n/story-display.ts";
import { t } from "../i18n/index.ts";
import { campNationById } from "../youth/satellite-camps.ts";
import type { ScoutJobCompleteNotice } from "../scouting/scout-job-postfach.ts";

export function scoutJobQueuePreview(notice: ScoutJobCompleteNotice | undefined): {
  name: string;
  topic: string;
} {
  if (!notice) return { name: t("shell.nav.scouting"), topic: "" };
  if (notice.kind === "region_complete") {
    return {
      name: notice.zoneLabel ?? notice.zoneId ?? "Region",
      topic: t("postfach.scoutJob.queueTopicRegion"),
    };
  }
  if (notice.kind === "opponent_scout_complete") {
    return {
      name: notice.opponentShortName ?? t("postfach.opponentScout.queueName"),
      topic: t("postfach.opponentScout.queueTopic"),
    };
  }
  return {
    name: notice.clubName ?? notice.careerClubId ?? t("postfach.archive.fallbackClub"),
    topic: t("postfach.scoutJob.queueTopicClub"),
  };
}

export function orthopedistQueuePreview(): { name: string; topic: string } {
  return {
    name: t("medical.ortho.queueName"),
    topic: t("medical.ortho.queueTopic"),
  };
}

export function campLeaderQueuePreview(campId: string): { name: string; topic: string } {
  const nation = campNationById(campId);
  return {
    name: nation?.label ?? campId,
    topic: t("postfach.campLeader.queueTopic"),
  };
}

export function inboxQueuePreview(
  item: DecisionInboxItem,
  players: readonly Player[],
  cast: StoryCast,
): { name: string; topic: string } {
  if (isStoryInboxItem(item) && item.narrative) {
    const body = localizeStoryInbox(item.narrative, cast).body;
    return {
      name: inboxItemLabel(item, cast),
      topic: body.length > 48 ? `${body.slice(0, 48)}…` : body,
    };
  }
  if (item.kind === "assistant_training_reminder") {
    return {
      name: cast.assistant_name,
      topic: inboxItemLabel(item, cast),
    };
  }
  if (item.kind === "kicker_transfer") {
    return {
      name: t("postfach.treter.queueName"),
      topic: t("postfach.treter.queueTopic"),
    };
  }
  const player = players.find((entry) => entry.id === item.playerId);
  return {
    name: player ? formatPlayerName(player) : t("inbox.modal.playerFallback"),
    topic: inboxItemLabel(item, cast),
  };
}
