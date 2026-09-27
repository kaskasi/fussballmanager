import { legacyWorldState } from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

/** Preserve pre-generator careers as explicit legacy worlds. */
export const migration035GeneratedWorld: SaveMigration = {
  id: "migration_035_generated_world",
  apply: (save) => {
    save.state.world ??= legacyWorldState(save.rng_state.master_seed);
    save.manifest.save_version = 35;
    return save;
  },
};
