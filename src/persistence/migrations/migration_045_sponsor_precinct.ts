import { normalizeClubStadium } from "../../stadium/club-stadium.ts";
import { emptyPrecinct } from "../../stadium/precinct.ts";
import type { SaveMigration } from "./index.ts";

export const migration045SponsorPrecinct: SaveMigration = {
  id: "migration_045_sponsor_precinct",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium({
        ...pipeline.club_stadium,
        sponsor_deals: pipeline.club_stadium.sponsor_deals ?? [],
        precinct: pipeline.club_stadium.precinct ?? emptyPrecinct(),
      });
    }
    save.manifest.save_version = 45;
    return save;
  },
};
