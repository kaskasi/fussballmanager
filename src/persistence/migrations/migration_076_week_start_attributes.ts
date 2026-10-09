import type { SaveMigration } from "./index.ts";

/** Training heatmap baseline for “this week so far” (PRD 09.3b). */
export const migration076WeekStartAttributes: SaveMigration = {
  id: "migration_076_week_start_attributes",
  apply(save) {
    save.manifest.save_version = 76;
    const season = save.state.season;
    const week = save.state.week;
    for (const player of save.players) {
      player.state.week_start_attributes = { ...player.attributes };
      player.state.week_start_key = { season, week };
    }
    return save;
  },
};
