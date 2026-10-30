import type { SaveMigration } from "./index.ts";

/** PRD 32 slice 4: `pipeline.season_archive` starts empty; past seasons cannot be rebuilt. */
export const migration104SeasonArchive: SaveMigration = {
  id: "migration_104_season_archive",
  apply(save) {
    if (save.state.pipeline && !Array.isArray(save.state.pipeline.season_archive)) {
      save.state.pipeline.season_archive = [];
    }
    save.manifest.save_version = 104;
    return save;
  },
};
