import {
  MAX_INBOX_ITEMS,
  pendingInboxItems,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import type { Player } from "../types/player.ts";

export type UnderpaidPromptMonth = 3 | 9 | 12;

export interface UnderpaidInboxPrompt {
  playerId: string;
  month: UnderpaidPromptMonth;
}

export function underpaidInboxItemId(playerId: string, month: UnderpaidPromptMonth): string {
  return `underpaid_${playerId}_m${month}`;
}

export function createUnderpaidRenegotiateItem(
  playerId: string,
  week: number,
  month: UnderpaidPromptMonth,
): DecisionInboxItem {
  const reason =
    month === 3 ? "underpaid_3mo" : month === 9 ? "underpaid_9mo" : "underpaid_12mo";
  return {
    id: underpaidInboxItemId(playerId, month),
    playerId,
    kind: "contract_renegotiate",
    week,
    urgency: month >= 9 ? "now" : "next_window",
    reason,
  };
}

export function enqueueUnderpaidRenegotiateItems(
  inbox: YouthInboxState,
  prompts: readonly UnderpaidInboxPrompt[],
  week: number,
  players: readonly Player[],
  clubId: string,
): YouthInboxState {
  let next = inbox;
  for (const prompt of prompts) {
    const player = players.find((entry) => entry.id === prompt.playerId);
    if (!player || player.club_id !== clubId) continue;
    const item = createUnderpaidRenegotiateItem(prompt.playerId, week, prompt.month);
    if (
      next.items.some((entry) => entry.id === item.id) ||
      next.queue.some((entry) => entry.id === item.id) ||
      next.resolvedIds.includes(item.id)
    ) {
      continue;
    }
    const openCount = pendingInboxItems(next, players).length;
    if (openCount >= MAX_INBOX_ITEMS) {
      next = { ...next, queue: [...next.queue, item] };
    } else {
      next = { ...next, items: [...next.items, item] };
    }
  }
  return next;
}
