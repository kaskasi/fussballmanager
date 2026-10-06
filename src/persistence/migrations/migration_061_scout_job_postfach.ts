import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

export const migration061ScoutJobPostfach: SaveMigration = {
  id: "migration_061_scout_job_postfach",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board && board.discovery_postfach_queue == null) {
      save.state.pipeline!.scout_board = {
        ...board,
        discovery_postfach_queue: [],
      };
    }
    save.manifest.save_version = 61;
    return save;
  },
};
