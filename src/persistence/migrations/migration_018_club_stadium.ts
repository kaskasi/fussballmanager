import { defaultClubStadium } from "../../stadium/club-stadium.ts";
import type { SaveMigration } from "./index.ts";

export const migration018ClubStadium: SaveMigration = {
  id: "migration_018_club_stadium",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && !pipeline.club_stadium) {
      pipeline.club_stadium = defaultClubStadium();
    }
    save.manifest.save_version = 18;
    return save;
  },
};
