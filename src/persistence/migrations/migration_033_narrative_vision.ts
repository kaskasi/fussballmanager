import type { SaveMigration } from "./index.ts";

/**
 * PRD 01 establishes narrative constraints without changing persisted data.
 * The no-op migration keeps the save version aligned with the binding PRDs.
 */
export const migration033NarrativeVision: SaveMigration = {
  id: "migration_033_narrative_vision",
  apply: (save) => {
    save.manifest.save_version = 33;
    return save;
  },
};
