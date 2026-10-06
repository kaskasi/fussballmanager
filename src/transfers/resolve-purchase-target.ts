import {
  getBoardTarget,
  type BoardTarget,
  type ScoutBoard,
} from "../scouting/scout-board.ts";
import type { Player } from "../types/player.ts";

/** Resolve a transfer target for purchase/negotiation (must be in scout pool). */
export function resolvePurchaseTarget(
  board: ScoutBoard,
  playerId: string,
  rivalPlayers: readonly Player[],
): BoardTarget | null {
  return getBoardTarget(board, playerId, rivalPlayers);
}
