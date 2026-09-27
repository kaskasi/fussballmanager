import { migrateLegacyTrainingPlan } from "../../development/training-units.ts";
import type { SaveMigration } from "./index.ts";

export const migration025TrainingFiveSlots: SaveMigration = {
  id: "migration_025_training_five_slots",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline?.training_plan) {
      pipeline.training_plan = migrateLegacyTrainingPlan(pipeline.training_plan);
    }
    save.manifest.save_version = 25;
    return save;
  },
};
