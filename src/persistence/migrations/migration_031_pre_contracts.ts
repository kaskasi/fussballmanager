import type { SaveMigration } from "./index.ts";

export const migration031PreContracts: SaveMigration = {
  id: "migration_031_pre_contracts",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline?.transfer_state && !pipeline.transfer_state.pending_transfers) {
      pipeline.transfer_state.pending_transfers = [];
    }
    save.manifest.save_version = 31;
    return save;
  },
};
