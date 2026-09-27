import type { SaveMigration } from "./index.ts";

export const migration020LastWeekGrowth: SaveMigration = {
  id: "migration_020_last_week_growth",
  apply: (save) => {
    for (const player of save.players) {
      if (player.state.last_week_growth === undefined) {
        player.state.last_week_growth = 0;
      }
    }
    save.manifest.save_version = 20;
    return save;
  },
};
