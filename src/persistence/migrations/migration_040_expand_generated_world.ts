import { expandGeneratedWorld, worldNeedsExpansion } from "../../world/upgrade-generated-world.ts";
import type { SaveMigration } from "./index.ts";

/** Replace legacy 6-club leagues with the full 18-club generated world. */
export const migration040ExpandGeneratedWorld: SaveMigration = {
  id: "migration_040_expand_generated_world",
  apply: (save) => {
    if (worldNeedsExpansion(save)) {
      expandGeneratedWorld(save);
    }
    save.manifest.save_version = 40;
    return save;
  },
};
