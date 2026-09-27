import type { SaveMigration } from "./index.ts";

export const migration028MatchLineup: SaveMigration = {
  id: "migration_028_match_lineup",
  apply: (save) => {
    save.manifest.save_version = 28;
    return save;
  },
};
