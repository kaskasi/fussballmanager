import {
  getBoardTarget,
  type BoardTarget,
  type ScoutBoard,
} from "../scouting/scout-board.ts";
import { initialEstimateForPlayer } from "../scouting/market-list.ts";
import { listedPlayerEstimate } from "./transfer-list-scout.ts";
import type { Player } from "../types/player.ts";
import type { TransferState } from "./negotiations.ts";
import { isPlayerListed } from "./transfer-listings.ts";

/** Scout pool target, or any rival listed on the transfer board. */
export function resolvePurchaseTarget(
  board: ScoutBoard,
  playerId: string,
  rivalPlayers: readonly Player[],
  transferState?: TransferState,
): BoardTarget | null {
  const fromBoard = getBoardTarget(board, playerId, rivalPlayers);
  if (fromBoard) return fromBoard;
  if (!transferState || !isPlayerListed(transferState, playerId)) return null;
  const player = rivalPlayers.find((entry) => entry.id === playerId);
  if (!player) return null;
  return {
    player,
    estimate: listedPlayerEstimate(player),
    assigned: false,
    assigned_scout_id: null,
  };
}
