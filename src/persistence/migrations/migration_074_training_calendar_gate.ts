import type { SaveMigration } from "./index.ts";

/** PRD 09.3b — Monday calendar step before training NEXT nexus. */
export const migration074TrainingCalendarGate: SaveMigration = {
  id: "migration_074_training_calendar_gate",
  apply(save) {
    save.manifest.save_version = 74;
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    if (pipeline.training_calendar_gate_done === undefined) {
      pipeline.training_calendar_gate_done = true;
    }
    return save;
  },
};
