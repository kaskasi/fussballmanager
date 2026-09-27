import { createScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

/** Replace youth-intake market pool with rival senior squads. */
export const migration014ScoutMarketRivals: SaveMigration = {
  id: "migration_014_scout_market_rivals",
  apply: (save) => {
    if (save.state.pipeline) {
      save.state.pipeline.scout_board = createScoutBoard();
    }
    save.manifest.save_version = 14;
    return save;
  },
};
