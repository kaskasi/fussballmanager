import type { SaveMigration } from "./index.ts";

/** PRD 34: `state.discipline` and `state.season_red_cards` are optional; nothing to backfill. */
export const migration105Suspensions: SaveMigration = {
  id: "migration_105_suspensions",
  apply(save) {
    save.manifest.save_version = 105;
    return save;
  },
};
