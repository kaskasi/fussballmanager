import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

/** Remove duplicated player snapshots from scouting knowledge. */
export const migration036ScoutKnowledge: SaveMigration = {
  id: "migration_036_scout_knowledge",
  apply: (save) => {
    const board = save.state.pipeline?.scout_board;
    if (board) {
      board.targets = Object.fromEntries(
        Object.entries(board.targets).map(([playerId, target]) => [
          playerId,
          {
            playerId,
            estimate: target.estimate,
            assigned: target.assigned ?? false,
          },
        ]),
      ) as ScoutBoard["targets"];
    }
    save.manifest.save_version = 36;
    return save;
  },
};
