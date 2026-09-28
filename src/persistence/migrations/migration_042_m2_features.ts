import { defaultScoutNetwork } from "../../scouting/scout-network.ts";
import type { SaveMigration } from "./index.ts";

export const migration042M2Features: SaveMigration = {
  id: "migration_042_m2_features",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    if (!pipeline.scout_network) {
      pipeline.scout_network = defaultScoutNetwork(
        save.state.season,
        save.rng_state.master_seed,
      );
    }
    save.manifest.save_version = 42;
    return save;
  },
};
