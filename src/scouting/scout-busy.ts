import type { ScoutBoard } from "./scout-board.ts";
import { listActiveScoutTrips } from "./scout-trip-queue.ts";

/** Hired scouts currently on map trips or opponent prep job. */
export function busyScoutIds(board: ScoutBoard): string[] {
  const ids = listActiveScoutTrips(board).map((trip) => trip.assigned_scout_id);
  const opponent = board.active_opponent_scout?.assigned_scout_id;
  if (opponent) ids.push(opponent);
  return ids;
}
