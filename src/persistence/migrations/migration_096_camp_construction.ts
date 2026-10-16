import type { SaveMigration } from "./index.ts";

/** Legacy owned camps were instant-build — treat opening talents as already delivered. */
export const migration096CampConstruction: SaveMigration = {
  id: "migration_096_camp_construction",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.youth_camps?.length) {
      pipeline.youth_camps = pipeline.youth_camps.map((camp) => ({
        ...camp,
        opening_players_delivered: camp.opening_players_delivered ?? true,
      }));
    }
    save.manifest.save_version = 96;
    return save;
  },
};
