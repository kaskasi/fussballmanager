import { DEFAULT_FANBASE, normalizeClubStadium } from "../../stadium/club-stadium.ts";
import type { SaveMigration } from "./index.ts";

export const migration019Fanbase: SaveMigration = {
  id: "migration_019_fanbase",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium({
        ...pipeline.club_stadium,
        fanbase: pipeline.club_stadium.fanbase ?? DEFAULT_FANBASE,
      });
    }
    save.manifest.save_version = 19;
    return save;
  },
};
