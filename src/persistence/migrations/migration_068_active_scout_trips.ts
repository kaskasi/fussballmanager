import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { listActiveScoutTrips } from "../../scouting/scout-trip-queue.ts";
import type { SaveMigration } from "./index.ts";

/** One active map trip per available scout (was single active_scout_trip). */
export const migration068ActiveScoutTrips: SaveMigration = {
  id: "migration_068_active_scout_trips",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board) {
      const active_scout_trips = listActiveScoutTrips(board);
      save.state.pipeline!.scout_board = {
        ...board,
        active_scout_trips,
        active_scout_trip: active_scout_trips[0] ?? null,
      };
    }
    save.manifest.save_version = 68;
    return save;
  },
};
