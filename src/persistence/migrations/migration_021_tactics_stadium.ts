import { defaultTacticsPresets } from "../../match/tactics-presets.ts";
import { defaultClubStadium } from "../../stadium/club-stadium.ts";
import type { SaveMigration } from "./index.ts";

export const migration021TacticsStadium: SaveMigration = {
  id: "migration_021_tactics_stadium",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline) {
      if (!pipeline.tactics_presets || pipeline.tactics_presets.length === 0) {
        pipeline.tactics_presets = defaultTacticsPresets();
      }
      if (pipeline.club_stadium && !pipeline.club_stadium.upgrade_levels) {
        pipeline.club_stadium.upgrade_levels = {};
      }
      if (!pipeline.club_stadium) {
        pipeline.club_stadium = defaultClubStadium();
      }
    }
    save.manifest.save_version = 21;
    return save;
  },
};
