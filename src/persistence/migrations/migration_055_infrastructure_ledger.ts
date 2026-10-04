import type { SaveMigration } from "./index.ts";

/** Additive FinanceLineKind infrastructure — old ledgers stay valid. */
export const migration055InfrastructureLedger: SaveMigration = {
  id: "migration_055_infrastructure_ledger",
  apply(save) {
    save.manifest.save_version = 55;
    return save;
  },
};
