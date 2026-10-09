import type { SaveMigration } from "./index.ts";
import { MERCH_SKU_IDS } from "../../economy/merchandising-skus.ts";
import { migrateLegacyMerchandising } from "../../economy/merchandising.ts";

export const migration081MerchUnitScale: SaveMigration = {
  id: "migration_081_merch_unit_scale",
  apply(save) {
    save.manifest.save_version = 81;
    const stadium = save.state.pipeline?.club_stadium;
    if (!stadium?.merchandising) return save;
    const merch = migrateLegacyMerchandising(stadium.merchandising);
    for (const id of MERCH_SKU_IDS) {
      const row = merch.skus[id];
      if (row) row.stock = Math.round(row.stock * 10);
    }
    stadium.merchandising = merch;
    return save;
  },
};
