import type { SaveGame } from "../savegame-model.ts";
import type { SaveMigration } from "./index.ts";

/** F8.2 — Medical staff + diagnosis queue state. */
export const migration091MedicalStaff: SaveMigration = {
  id: "migration_091_medical_staff",
  apply(save: SaveGame) {
    const pipeline = save.state.pipeline;
    if (pipeline) {
      pipeline.medical_staff = pipeline.medical_staff ?? {
        doctor: null,
        physios: [],
        orthopedist: null,
      };
      pipeline.medical_state = pipeline.medical_state ?? { pending_diagnoses: [] };
      pipeline.orthopedist_hire = pipeline.orthopedist_hire ?? { phase: "none" };
    }
    save.manifest.save_version = 91;
    return save;
  },
};
