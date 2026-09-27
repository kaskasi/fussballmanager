import type { SaveMigration } from "./index.ts";

export const migration032SeasonAwards: SaveMigration = {
  id: "migration_032_season_awards",
  apply: (save) => {
    save.manifest.save_version = 32;
    return save;
  },
};
