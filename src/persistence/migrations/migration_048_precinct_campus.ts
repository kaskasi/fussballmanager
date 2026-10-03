import { normalizeClubStadium } from "../../stadium/club-stadium.ts";
import { normalizePrecinct } from "../../stadium/precinct.ts";
import type { SaveMigration } from "./index.ts";

/** Campus catalog + unique/many caps + upgrade levels on existing Gelände. */
export const migration048PrecinctCampus: SaveMigration = {
  id: "migration_048_precinct_campus",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium({
        ...pipeline.club_stadium,
        precinct: normalizePrecinct(pipeline.club_stadium.precinct),
      });
    }
    save.manifest.save_version = 48;
    return save;
  },
};
