import { initializeRivalPlayers } from "../../sim/rival-growth.ts";
import type { SaveMigration } from "./index.ts";

export const migration024RivalGrowth: SaveMigration = {
  id: "migration_024_rival_growth",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && !pipeline.rival_players?.length) {
      pipeline.rival_players = initializeRivalPlayers(save.rng_state.master_seed);
    }
    save.manifest.save_version = 24;
    return save;
  },
};
