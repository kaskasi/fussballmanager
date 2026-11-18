import { ensureYouthContract } from "../../player/youth-contract.ts";
import type { SaveMigration } from "./index.ts";

/** Frozen: the 34-week season this migration was written for. */
const LEGACY_LAST_WEEK = 34;

export const migration008Calendar: SaveMigration = {
  id: "migration_008_calendar",
  apply: (save) => {
    if (save.state.week > LEGACY_LAST_WEEK) {
      save.state.week = ((save.state.week - 1) % LEGACY_LAST_WEEK) + 1;
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
