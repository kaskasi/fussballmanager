import { campLeaderPostfachItemId } from "./postfach-camp-leader.ts";
import type { ScoutJobCompleteNotice } from "../scouting/scout-job-postfach.ts";
import type { DecisionInboxItem } from "../youth/decision-inbox.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";

/** Open Postfach queue order: youth decisions → camp leader → scout jobs. */
export function buildPostfachQueueIds(
  pending: readonly DecisionInboxItem[],
  campLeaderCamps: readonly YouthCamp[],
  scoutJobNotices: readonly ScoutJobCompleteNotice[],
): string[] {
  return [
    ...pending.map((item) => item.id),
    ...campLeaderCamps.map((camp) => campLeaderPostfachItemId(camp.id)),
    ...scoutJobNotices.map((notice) => notice.id),
  ];
}

export function firstPostfachQueueId(queueIds: readonly string[]): string | undefined {
  return queueIds[0];
}
