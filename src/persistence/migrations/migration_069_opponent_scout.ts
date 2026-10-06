import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

/** Gegner-Scout job state on scout board (PRD 22). */
export const migration069OpponentScout: SaveMigration = {
  id: "migration_069_opponent_scout",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board && board.active_opponent_scout === undefined) {
      save.state.pipeline!.scout_board = {
        ...board,
        active_opponent_scout: null,
      };
    }
    save.manifest.save_version = 69;
    return save;
  },
};
