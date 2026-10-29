import {
  MAX_INBOX_ITEMS,
  pendingInboxItems,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import type { Player } from "../types/player.ts";

/** PRD 31 §9 — one Postfach decision per announced retirement. */
export function retirementInboxItemId(playerId: string, season: number): string {
  return `retire_${playerId}_s${season}`;
}

export function enqueueRetirementItems(
  inbox: YouthInboxState,
  playerIds: readonly string[],
  season: number,
  week: number,
  players: readonly Player[],
): YouthInboxState {
  let next = inbox;
  for (const playerId of playerIds) {
    const item: DecisionInboxItem = {
      id: retirementInboxItemId(playerId, season),
      playerId,
      kind: "retirement_announce",
      week,
      urgency: "now",
      reason: "retirement_announce",
    };
    if (
      next.items.some((entry) => entry.id === item.id) ||
      next.queue.some((entry) => entry.id === item.id) ||
      next.resolvedIds.includes(item.id)
    ) {
      continue;
    }
    next =
      pendingInboxItems(next, players).length >= MAX_INBOX_ITEMS
        ? { ...next, queue: [...next.queue, item] }
        : { ...next, items: [...next.items, item] };
  }
  return next;
}
