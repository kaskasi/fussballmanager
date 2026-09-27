import type { SaveMigration } from "./index.ts";

/**
 * Growth is applied prospectively, so existing attributes remain historical
 * truth and need no transformation.
 */
export const migration037GrowthRebalance: SaveMigration = {
  id: "migration_037_growth_rebalance",
  apply: (save) => {
    save.manifest.save_version = 37;
    return save;
  },
};
