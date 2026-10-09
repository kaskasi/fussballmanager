import type { SaveMigration } from "./index.ts";
import {
  defaultClubMerchandising,
  migrateLegacyMerchandising,
} from "../../economy/merchandising.ts";

export const migration080MerchInventory: SaveMigration = {
  id: "migration_080_merch_inventory",
  apply(save) {
    save.manifest.save_version = 80;
    const stadium = save.state.pipeline?.club_stadium;
    if (!stadium) return save;
    stadium.merchandising = migrateLegacyMerchandising(stadium.merchandising);
    if (!stadium.merchandising.skus) {
      stadium.merchandising = defaultClubMerchandising();
    }
    return save;
  },
};
