import type { SaveMigration } from "./index.ts";

export const migration044ContractTalkLocks: SaveMigration = {
  id: "migration_044_contract_talk_locks",
  apply(save) {
    save.manifest.save_version = 44;
    return save;
  },
};
