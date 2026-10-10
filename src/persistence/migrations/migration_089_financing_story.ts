import type { SaveMigration } from "./index.ts";

/** F6.6-B/C — additive stadium naming + merch drop fields; financing state already on 088. */
export const migration089FinancingStory: SaveMigration = {
  id: "migration_089_financing_story",
  apply(save) {
    save.manifest.save_version = 89;
    return save;
  },
};
