import type { SaveMigration } from "./index.ts";

export const migration043ContractTalks: SaveMigration = {
  id: "migration_043_contract_talks",
  apply(save) {
    save.manifest.save_version = 43;
    return save;
  },
};
