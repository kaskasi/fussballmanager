import { defaultFinancingState, normalizeFinancingState } from "../../economy/financing.ts";
import type { SaveMigration } from "./index.ts";

export const migration088Financing: SaveMigration = {
  id: "migration_088_financing",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline) {
      pipeline.financing = normalizeFinancingState(pipeline.financing ?? defaultFinancingState());
    }
    save.manifest.save_version = 88;
    return save;
  },
};
