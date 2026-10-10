import { normalizeClubStadium } from "../../stadium/club-stadium.ts";
import type { SaveMigration } from "./index.ts";

export const migration087ConcessionPrices: SaveMigration = {
  id: "migration_087_concession_prices",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium(pipeline.club_stadium);
    }
    save.manifest.save_version = 87;
    return save;
  },
};
