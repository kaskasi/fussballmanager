import { ensureFullPrecinctOwned } from "../../stadium/precinct.ts";
import type { SaveMigration } from "./index.ts";

/** Free 14×10 precinct — grant all expansion cells on load. */
export const migration077PrecinctFullFarm: SaveMigration = {
  id: "migration_077_precinct_full_farm",
  apply(save) {
    save.manifest.save_version = 77;
    const stadium = save.state.pipeline?.club_stadium;
    if (!stadium?.precinct) return save;
    stadium.precinct.owned = ensureFullPrecinctOwned(stadium.precinct.owned ?? {});
    return save;
  },
};
