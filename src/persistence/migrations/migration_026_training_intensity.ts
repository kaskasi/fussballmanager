import { DEFAULT_TRAINING_INTENSITY } from "../../development/training-load.ts";
import type { SaveMigration } from "./index.ts";

export const migration026TrainingIntensity: SaveMigration = {
  id: "migration_026_training_intensity",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && pipeline.training_intensity === undefined) {
      pipeline.training_intensity = DEFAULT_TRAINING_INTENSITY;
    }
    save.manifest.save_version = 26;
    return save;
  },
};
