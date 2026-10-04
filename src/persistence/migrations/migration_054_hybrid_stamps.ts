import type { SaveMigration } from "./index.ts";

/** Catalog add only — existing stamps are not rewritten. */
export const migration054HybridStamps: SaveMigration = {
  id: "migration_054_hybrid_stamps",
  apply(save) {
    save.manifest.save_version = 54;
    return save;
  },
};
