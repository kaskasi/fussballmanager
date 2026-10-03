import { normalizeClubStadium } from "../../stadium/club-stadium.ts";
import { normalizePrecinct } from "../../stadium/precinct.ts";
import type { SaveMigration } from "./index.ts";

/** Gelände: 14×10 farm, city-to-arena spine, 2×5 side tiles. */
export const migration050PrecinctFarm: SaveMigration = {
  id: "migration_050_precinct_farm",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium({
        ...pipeline.club_stadium,
        precinct: normalizePrecinct(pipeline.club_stadium.precinct),
      });
    }
    save.manifest.save_version = 50;
    return save;
  },
};
