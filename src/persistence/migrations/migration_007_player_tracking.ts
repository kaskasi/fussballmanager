import type { SaveMigration } from "./index.ts";

export const migration007PlayerTracking: SaveMigration = {
  id: "migration_007_player_tracking",
  apply: (save) => {
    for (const player of save.players) {
      player.state.recent_weekly_minutes = player.state.recent_weekly_minutes ?? [];
      player.state.recent_growth_26w = player.state.recent_growth_26w ?? 0;
    }
    save.manifest.save_version = 7;
    return save;
  },
};
