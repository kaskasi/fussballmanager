import { migrateLegacyTrainingPlan } from "../../development/training-units.ts";
import type { SaveMigration } from "./index.ts";

/** Mo–Fr × 3 training units per day (reverts migration 025 collapse). */
export const migration070TrainingFifteenSlots: SaveMigration = {
  id: "migration_070_training_fifteen_slots",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.training_plan) {
      pipeline.training_plan = migrateLegacyTrainingPlan(pipeline.training_plan);
    }
    save.manifest.save_version = 70;
    return save;
  },
};
