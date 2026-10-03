import { normalizeClubStadium } from "../../stadium/club-stadium.ts";
import { normalizePrecinct } from "../../stadium/precinct.ts";
import type { SaveMigration } from "./index.ts";

/** Gelände-v2: 12×10 board, patch footprints, owned core, streets. */
export const migration049PrecinctPatches: SaveMigration = {
  id: "migration_049_precinct_patches",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.club_stadium) {
      pipeline.club_stadium = normalizeClubStadium({
        ...pipeline.club_stadium,
        precinct: normalizePrecinct(pipeline.club_stadium.precinct),
      });
    }
    save.manifest.save_version = 49;
    return save;
  },
};
