/**
 * Transfer-board players are public — faster scout intel than cold targets (PRD 05).
 */
import { applyObservationWithAccuracy } from "../scouting/scout-network.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import { estimateCa } from "./market-value.ts";
import type { Player } from "../types/player.ts";
import type { TransferState } from "./negotiations.ts";
import { isPlayerListed } from "./transfer-listings.ts";

/** Listed players are visible on the board — narrower prior than random pool guesses. */
export function listedPlayerEstimate(player: Player): AbilityEstimate {
  const ca = Math.round(estimateCa(player.attributes, player.position));
  return {
    estimatedAbilityMean: ca,
    uncertaintyRange: 14,
    sampleSize: 2,
  };
}

export function mergeListedEstimate(current: AbilityEstimate, player: Player): AbilityEstimate {
  const listed = listedPlayerEstimate(player);
  if (current.uncertaintyRange <= listed.uncertaintyRange) return current;
  return listed;
}

/** After assigning a scout from the transfer list: intel firm enough to bid within 1–2 days. */
export function applyTransferListScoutOnAssign(
  board: ScoutBoard,
  playerId: string,
  player: Player,
  transferState: TransferState,
  accuracy: number,
): ScoutBoard {
  if (!isPlayerListed(transferState, playerId)) return board;
  const target = board.targets[playerId];
  if (!target) return board;

  let estimate = mergeListedEstimate(target.estimate, player);
  let knowledge = { status: "scouted" as const, estimate };
  knowledge = applyObservationWithAccuracy(knowledge, "scout_visit_report", accuracy);
  knowledge = applyObservationWithAccuracy(knowledge, "scout_visit_report", accuracy);

  return {
    ...board,
    targets: {
      ...board.targets,
      [playerId]: { ...target, estimate: knowledge.estimate },
    },
  };
}
