import type { SaveMigration } from "./index.ts";
import { defaultClubMerchandising } from "../../economy/merchandising.ts";

export const migration079Merchandising: SaveMigration = {
  id: "migration_079_merchandising",
  apply(save) {
    save.manifest.save_version = 79;
    const stadium = save.state.pipeline?.club_stadium;
    if (stadium && !stadium.merchandising) {
      stadium.merchandising = defaultClubMerchandising();
    }
    return save;
  },
};
