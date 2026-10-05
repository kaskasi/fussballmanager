import { withCoachPortraitSeed } from "../../staff/coaching-staff.ts";
import type { SaveMigration } from "./index.ts";

export const migration056CoachPortraitSeed: SaveMigration = {
  id: "migration_056_coach_portrait_seed",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.coaching_staff) {
      const staff = pipeline.coaching_staff;
      pipeline.coaching_staff = {
        attack: staff.attack ? withCoachPortraitSeed(staff.attack) : null,
        defense: staff.defense ? withCoachPortraitSeed(staff.defense) : null,
        fitness: staff.fitness ? withCoachPortraitSeed(staff.fitness) : null,
      };
    }
    save.manifest.save_version = 56;
    return save;
  },
};
