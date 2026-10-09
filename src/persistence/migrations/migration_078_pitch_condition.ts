import type { SaveMigration } from "./index.ts";
import { PITCH_CONDITION_MAX } from "../../stadium/precinct-campus-events.ts";

export const migration078PitchCondition: SaveMigration = {
  id: "migration_078_pitch_condition",
  apply(save) {
    save.manifest.save_version = 78;
    const stadium = save.state.pipeline?.club_stadium;
    if (!stadium) return save;
    if (stadium.pitch_condition == null) {
      stadium.pitch_condition = PITCH_CONDITION_MAX;
    }
    return save;
  },
};
