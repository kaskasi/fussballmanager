import type { SaveMigration } from "./index.ts";

/**
 * PRD 12 defines the future generated-world schema. Runtime world data is
 * unchanged until that implementation lands, so this alignment migration is
 * intentionally data-neutral.
 */
export const migration034LeagueWorldPrd: SaveMigration = {
  id: "migration_034_league_world_prd",
  apply: (save) => {
    save.manifest.save_version = 34;
    return save;
  },
};
