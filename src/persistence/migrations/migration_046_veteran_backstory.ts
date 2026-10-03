import { applyVeteranBackstory, seedFromPlayerId } from "../../player/veteran-backstory.ts";
import type { SaveMigration } from "./index.ts";

export const migration046VeteranBackstory: SaveMigration = {
  id: "migration_046_veteran_backstory",
  apply(save) {
    save.players = save.players.map((player) => {
      if (player.age <= 20) return player;
      if (player.squad_status === "u17" || player.squad_status === "u19") return player;
      return applyVeteranBackstory(player, seedFromPlayerId(player.id));
    });
    save.manifest.save_version = 46;
    return save;
  },
};
