import type { Player } from "../types/player.ts";
import { applyMapClubVisitToEstimate } from "./estimate-model.ts";
import type { ScoutKnowledgeTarget } from "./scout-board.ts";

export function applyMapClubVisitToBoardTargets(
  targets: Record<string, ScoutKnowledgeTarget>,
  careerClubId: string,
  rivalPlayers: readonly Player[],
): Record<string, ScoutKnowledgeTarget> {
  const next = { ...targets };
  for (const player of rivalPlayers) {
    if (player.club_id !== careerClubId || player.squad_status !== "pro") continue;
    const entry = next[player.id];
    if (!entry) continue;
    next[player.id] = {
      ...entry,
      estimate: applyMapClubVisitToEstimate(entry.estimate),
    };
  }
  return next;
}

export function applyMapClubVisitToBoardTargetsForClubs(
  targets: Record<string, ScoutKnowledgeTarget>,
  careerClubIds: readonly string[],
  rivalPlayers: readonly Player[],
): Record<string, ScoutKnowledgeTarget> {
  let next = targets;
  for (const careerClubId of careerClubIds) {
    next = applyMapClubVisitToBoardTargets(next, careerClubId, rivalPlayers);
  }
  return next;
}
