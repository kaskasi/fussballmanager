import { normalizeMerchExpert } from "../../economy/merchandising-expert.ts";
import type { SaveMigration } from "./index.ts";

/** Merchandising-Experte: `expert` state on the club merchandising block (default: not hired). */
export const migration098MerchExpert: SaveMigration = {
  id: "migration_098_merch_expert",
  apply(save) {
    const merchandising = save.state.pipeline?.club_stadium?.merchandising;
    if (merchandising) {
      merchandising.expert = normalizeMerchExpert(merchandising.expert);
    }
    save.manifest.save_version = 98;
    return save;
  },
};
