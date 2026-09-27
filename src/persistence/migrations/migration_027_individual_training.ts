import type { SaveMigration } from "./index.ts";

export const migration027IndividualTraining: SaveMigration = {
  id: "migration_027_individual_training",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && !pipeline.individual_programs) {
      pipeline.individual_programs = [];
    }
    save.manifest.save_version = 27;
    return save;
  },
};
