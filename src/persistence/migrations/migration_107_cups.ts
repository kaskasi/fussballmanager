import type { SaveMigration } from "./index.ts";

/** PRD 36: `pipeline.cups` is created on load (`ensureCupSeason`); nothing to backfill here. */
export const migration107Cups: SaveMigration = {
  id: "migration_107_cups",
  apply(save) {
    save.manifest.save_version = 107;
    return save;
  },
};
