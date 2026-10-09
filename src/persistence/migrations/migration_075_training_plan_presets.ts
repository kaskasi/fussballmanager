import { defaultTrainingPlanPresets } from "../../development/training-plan-presets.ts";
import type { SaveMigration } from "./index.ts";

/** F2.1 — saved weekly training templates (3 slots). */
export const migration075TrainingPlanPresets: SaveMigration = {
  id: "migration_075_training_plan_presets",
  apply(save) {
    save.manifest.save_version = 75;
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    if (!pipeline.training_plan_presets) {
      pipeline.training_plan_presets = defaultTrainingPlanPresets();
    }
    return save;
  },
};
