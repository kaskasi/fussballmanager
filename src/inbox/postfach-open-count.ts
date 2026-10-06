import type { Player } from "../types/player.ts";
import { unconsumedScoutJobNotices } from "../scouting/scout-job-postfach.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { campsAwaitingLeaderChoice } from "../youth/camp-leader-hire.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";

/** Open Postfach actions: youth decisions + camp leader picks + scout job notices. */
export function postfachOpenCount(
  youthInbox: YouthInboxState,
  players: readonly Player[],
  youthCamps: readonly YouthCamp[],
  scoutBoard?: ScoutBoard,
): number {
  return (
    pendingInboxItems(youthInbox, players).length +
    campsAwaitingLeaderChoice(youthCamps).length +
    (scoutBoard ? unconsumedScoutJobNotices(scoutBoard).length : 0)
  );
}
