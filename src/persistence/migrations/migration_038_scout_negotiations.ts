import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { TransferState } from "../../transfers/negotiations.ts";
import type { SaveMigration } from "./index.ts";

export const migration038ScoutNegotiations: SaveMigration = {
  id: "migration_038_scout_negotiations",
  apply: (save) => {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board) {
      board.assignments = board.assignments ?? [];
      board.discoveryAlerts = board.discoveryAlerts ?? [];
    }
    const transferState = save.state.pipeline?.transfer_state as TransferState | undefined;
    if (transferState) {
      transferState.negotiations = transferState.negotiations ?? [];
    }
    save.manifest.save_version = 38;
    return save;
  },
};
