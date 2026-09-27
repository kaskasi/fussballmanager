import type { SaveMigration } from "./index.ts";

/** Add transfer history ledger to pipeline transfer state. */
export const migration015TransferHistory: SaveMigration = {
  id: "migration_015_transfer_history",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline?.transfer_state && !Array.isArray(pipeline.transfer_state.history)) {
      pipeline.transfer_state.history = [];
    }
    save.manifest.save_version = 15;
    return save;
  },
};
