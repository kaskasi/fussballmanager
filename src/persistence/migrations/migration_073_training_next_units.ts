import { SATURDAY } from "../../sim/day-calendar.ts";
import { SLOT_COUNT } from "../../development/weekly-plan.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 09.3 — per-unit training progress for header NEXT nexus. */
export const migration073TrainingNextUnits: SaveMigration = {
  id: "migration_073_training_next_units",
  apply(save) {
    save.manifest.save_version = 73;
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    const weekday = save.state.weekday ?? 1;
    if (weekday >= SATURDAY) {
      pipeline.training_units_completed = SLOT_COUNT;
    } else if (pipeline.training_units_completed === undefined) {
      pipeline.training_units_completed = 0;
    }
    return save;
  },
};
