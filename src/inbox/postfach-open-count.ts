import type { Player } from "../types/player.ts";
import { unconsumedScoutJobNotices } from "../scouting/scout-job-postfach.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { campsAwaitingLeaderChoice } from "../youth/camp-leader-hire.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";
import type { OrthopedistHireState } from "../medical/orthopedist-hire.ts";
import { orthopedistAwaitingPostfach } from "../medical/orthopedist-hire.ts";

/** Open Postfach actions: youth decisions + camp leader picks + scout job notices. */
export function postfachOpenCount(
  youthInbox: YouthInboxState,
  players: readonly Player[],
  youthCamps: readonly YouthCamp[],
  scoutBoard?: ScoutBoard,
  orthopedistHire?: OrthopedistHireState,
  hasOrthopedist?: boolean,
): number {
  return (
    pendingInboxItems(youthInbox, players).length +
    campsAwaitingLeaderChoice(youthCamps).length +
    (orthopedistHire && orthopedistAwaitingPostfach(orthopedistHire, Boolean(hasOrthopedist))
      ? 1
      : 0) +
    (scoutBoard ? unconsumedScoutJobNotices(scoutBoard).length : 0)
  );
}
