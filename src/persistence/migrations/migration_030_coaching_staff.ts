import { defaultCoachingStaff } from "../../staff/coaching-staff.ts";
import type { SaveMigration } from "./index.ts";

export const migration030CoachingStaff: SaveMigration = {
  id: "migration_030_coaching_staff",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && !pipeline.coaching_staff) {
      pipeline.coaching_staff = defaultCoachingStaff(save.state.season);
    }
    save.manifest.save_version = 30;
    return save;
  },
};
