import { SEASON_END_WEEK } from "../../sim/game-calendar.ts";
import { ensureYouthContract } from "../../player/youth-contract.ts";
import type { SaveMigration } from "./index.ts";

export const migration008Calendar: SaveMigration = {
  id: "migration_008_calendar",
  apply: (save) => {
    if (save.state.week > SEASON_END_WEEK) {
      save.state.week = ((save.state.week - 1) % SEASON_END_WEEK) + 1;
    }
    if (save.state.week === 0) {
      save.state.week = 1;
    }
    for (const player of save.players) {
      if (player.squad_status === "u17" || player.squad_status === "u19") {
        Object.assign(player, ensureYouthContract(player, save.state.season));
      }
    }
    save.manifest.save_version = 8;
    return save;
  },
};
