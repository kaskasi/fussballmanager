import type { SaveMigration } from "./index.ts";

export const migration082MerchTimedSale: SaveMigration = {
  id: "migration_082_merch_timed_sale",
  apply(save) {
    save.manifest.save_version = 82;
    return save;
  },
};
