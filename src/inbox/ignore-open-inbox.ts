import type { GameSession } from "../persistence/game-session.ts";
import {
  applyInboxDecision,
  isStoryInboxItem,
  pendingInboxItems,
} from "../youth/decision-inbox.ts";

/**
 * "Simulate until" treats open inbox items as ignored: Der Treter counts as read and routine
 * offers are dismissed. Departure risks and retirement announcements stay open (ignoring them is
 * how the player leaves) and story decisions stay open — nobody picks a choice on the player's behalf.
 */
export function ignoreOpenInbox(session: GameSession): GameSession {
  let inbox = session.youthInbox;
  let players = session.players;
  for (const item of pendingInboxItems(inbox, players)) {
    if (item.kind === "departure_risk" || item.kind === "retirement_announce" || isStoryInboxItem(item)) continue;
    const result = applyInboxDecision(inbox, players, item.id, "dismiss", session.season, session.week);
    inbox = result.inbox;
    players = result.players;
  }
  if (inbox === session.youthInbox && players === session.players) return session;
  return { ...session, youthInbox: inbox, players };
}
