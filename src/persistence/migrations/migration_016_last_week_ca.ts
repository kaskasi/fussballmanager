import { playerCa } from "../../player/ca-tracking.ts";
import type { SaveMigration } from "./index.ts";

export const migration016LastWeekCa: SaveMigration = {
  id: "migration_016_last_week_ca",
  apply: (save) => {
    for (const player of save.players) {
      if (player.state.last_week_ca === undefined) {
        player.state.last_week_ca = playerCa(player);
      }
    }
    save.manifest.save_version = 16;
    return save;
  },
};
