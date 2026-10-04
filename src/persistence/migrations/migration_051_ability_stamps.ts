import type { Player } from "../../types/player.ts";
import type { SaveMigration } from "./index.ts";

function ensureStamps(player: Player): Player {
  if (Array.isArray(player.stamps)) return player;
  return { ...player, stamps: [] };
}

/** F2.8 / PRD 07.5 — empty mechanical stamp array on every player. */
export const migration051AbilityStamps: SaveMigration = {
  id: "migration_051_ability_stamps",
  apply(save) {
    save.players = save.players.map(ensureStamps);
    save.retired = (save.retired as Player[]).map(ensureStamps);
    const rivals = save.state.pipeline?.rival_players;
    if (rivals) {
      save.state.pipeline!.rival_players = rivals.map(ensureStamps);
    }
    save.manifest.save_version = 51;
    return save;
  },
};
