import { isCampLeaderPostfachItemId } from "./postfach-camp-leader.ts";
import { isOrthopedistPostfachItemId } from "../medical/orthopedist-hire.ts";
import { isScoutJobPostfachItemId } from "./postfach-scout-job.ts";
import { scoutJobNoticeById, type ScoutJobCompleteNotice } from "../scouting/scout-job-postfach.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";

export type PostfachPresentation =
  | "inline-youth"
  | "inline-story"
  | "inline-scout-job"
  | "modal-camp"
  | "modal-orthopedist"
  | "modal-opponent-scout";

export function postfachPresentation(
  queueId: string | null,
  scoutBoard?: ScoutBoard,
): PostfachPresentation | null {
  if (!queueId) return null;
  if (isCampLeaderPostfachItemId(queueId)) return "modal-camp";
  if (isOrthopedistPostfachItemId(queueId)) return "modal-orthopedist";
  if (isScoutJobPostfachItemId(queueId) && scoutBoard) {
    const notice = scoutJobNoticeById(scoutBoard, queueId);
    if (notice?.kind === "opponent_scout_complete") return "modal-opponent-scout";
    if (notice) return "inline-scout-job";
  }
  return "inline-youth";
}

export function activeScoutJobNotice(
  queueId: string | null,
  scoutBoard?: ScoutBoard,
): ScoutJobCompleteNotice | undefined {
  if (!queueId || !scoutBoard || !isScoutJobPostfachItemId(queueId)) return undefined;
  return scoutJobNoticeById(scoutBoard, queueId);
}

export function postfachUsesExpandModal(presentation: PostfachPresentation | null): boolean {
  return (
    presentation === "modal-camp" ||
    presentation === "modal-orthopedist" ||
    presentation === "modal-opponent-scout"
  );
}
