import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

/** Scout map trips: queued routes with working-day duration (PRD 21). */
export const migration064ScoutTrips: SaveMigration = {
  id: "migration_064_scout_trips",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board) {
      save.state.pipeline!.scout_board = {
        ...board,
        scout_trip_queue: board.scout_trip_queue ?? [],
        active_scout_trip: board.active_scout_trip ?? null,
      };
    }
    save.manifest.save_version = 64;
    return save;
  },
};
