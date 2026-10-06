import type { Player } from "../types/player.ts";
import { campsAwaitingLeaderChoice } from "../youth/camp-leader-hire.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";

/** Open Postfach actions: youth decisions + camp leader picks (separate caps). */
export function postfachOpenCount(
  youthInbox: YouthInboxState,
  players: readonly Player[],
  youthCamps: readonly YouthCamp[],
): number {
  return pendingInboxItems(youthInbox, players).length + campsAwaitingLeaderChoice(youthCamps).length;
}
