import type { SaveGame } from "../savegame-model.ts";
import type { SaveMigration } from "./index.ts";

/** Training reminder stamp + weekly plan accountability (additive pipeline fields). */
export const migration059TrainingAccountability: SaveMigration = {
  id: "migration_059_training_accountability",
  apply(save: SaveGame) {
    if (!save.state.pipeline) {
      save.state.pipeline = {} as SaveGame["state"]["pipeline"];
    }
    save.manifest.save_version = 59;
    return save;
  },
};
