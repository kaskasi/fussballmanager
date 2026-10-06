import type { SaveMigration } from "./index.ts";

/** F2.3 — optional retrain_failures on player state (PRD 07.7). */
export const migration057RetrainFailures: SaveMigration = {
  id: "migration_057_retrain_failures",
  apply(save) {
    save.manifest.save_version = 57;
    return save;
  },
};
