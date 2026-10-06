import { initialEstimateForPlayer } from "../scouting/market-list.ts";
import {
  getBoardTarget,
  type BoardTarget,
  type ScoutBoard,
} from "../scouting/scout-board.ts";
import type { Player } from "../types/player.ts";

/** Resolve a transfer target for purchase/negotiation (board row + rival snapshot). */
export function resolvePurchaseTarget(
  board: ScoutBoard,
  playerId: string,
  rivalPlayers: readonly Player[],
): BoardTarget | null {
  const fromBoard = getBoardTarget(board, playerId, rivalPlayers);
  if (fromBoard) return fromBoard;

  const player = rivalPlayers.find((entry) => entry.id === playerId);
  if (!player) return null;

  const index = rivalPlayers.findIndex((entry) => entry.id === playerId);
  const existing = board.targets[playerId];
  return {
    player,
    estimate: existing?.estimate ?? initialEstimateForPlayer(player, Math.max(0, index)),
    assigned: existing?.assigned ?? false,
  };
}
