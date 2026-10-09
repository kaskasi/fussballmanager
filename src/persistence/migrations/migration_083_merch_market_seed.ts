import type { SaveMigration } from "./index.ts";
import {
  fanshopMerchLevel,
  merchMaxBulkOfferSlots,
} from "../../economy/merchandising-capacity.ts";
import {
  migrateLegacyMerchandising,
  normalizeClubMerchandising,
} from "../../economy/merchandising.ts";
import { seedInitialMerchBulkOffers } from "../../economy/merchandising-market.ts";

export const migration083MerchMarketSeed: SaveMigration = {
  id: "migration_083_merch_market_seed",
  apply(save) {
    save.manifest.save_version = 83;
    const stadium = save.state.pipeline?.club_stadium;
    if (!stadium) return save;
    const merch = migrateLegacyMerchandising(stadium.merchandising);
    if (merch.bulk_offers.length >= 2) {
      stadium.merchandising = normalizeClubMerchandising(merch);
      return save;
    }
    const season = save.state.season ?? 1;
    const week = save.state.week ?? 1;
    const masterSeed = save.rng_state.master_seed;
    const slots = merchMaxBulkOfferSlots(fanshopMerchLevel(stadium.precinct));
    merch.bulk_offers = seedInitialMerchBulkOffers(masterSeed, season, week, slots);
    merch.on_demand_queue = merch.on_demand_queue ?? [];
    stadium.merchandising = merch;
    return save;
  },
};
