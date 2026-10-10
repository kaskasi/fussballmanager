import { normalizeFinancingState } from "../../economy/financing.ts";
import type { SaveMigration } from "./index.ts";

/** F6.8 — ensure crisis counters exist on financing state. */
export const migration090FinancialCrisis: SaveMigration = {
  id: "migration_090_financial_crisis",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.financing) {
      pipeline.financing = normalizeFinancingState(pipeline.financing);
    }
    save.manifest.save_version = 90;
    return save;
  },
};
