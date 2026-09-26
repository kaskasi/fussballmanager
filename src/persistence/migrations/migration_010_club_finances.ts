import { defaultClubFinances } from "../../economy/club-finances.ts";
import { ensureYouthContract } from "../../player/youth-contract.ts";
import { defaultPipelineState } from "../pipeline-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration010ClubFinances: SaveMigration = {
  id: "migration_010_club_finances",
  apply: (save) => {
    const pipeline = save.state.pipeline ?? defaultPipelineState(save.state.week);
    pipeline.club_finances = pipeline.club_finances ?? defaultClubFinances();
    save.state.pipeline = pipeline;

    for (const player of save.players) {
      if (player.squad_status === "u17" || player.squad_status === "u19") {
        Object.assign(player, ensureYouthContract(player, save.state.season));
      }
    }

    save.manifest.save_version = 10;
    return save;
  },
};
