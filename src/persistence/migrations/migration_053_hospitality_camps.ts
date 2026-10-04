import type { Player } from "../../types/player.ts";
import type { SaveMigration } from "./index.ts";

function migratePlayer(player: Player): Player {
  return {
    ...player,
    state: {
      ...player.state,
      youth_site: player.state.youth_site ?? "hq",
    },
  };
}

/** Hospitality occupancy flags, HQ academy stage, satellite camps. */
export const migration053HospitalityCamps: SaveMigration = {
  id: "migration_053_hospitality_camps",
  apply(save) {
    save.players = save.players.map(migratePlayer);
    save.retired = (save.retired as Player[]).map(migratePlayer);
    const rivals = save.state.pipeline?.rival_players;
    if (rivals) {
      save.state.pipeline!.rival_players = rivals.map(migratePlayer);
    }
    if (save.state.pipeline) {
      save.state.pipeline.academy_facility = save.state.pipeline.academy_facility ?? "academy_basic";
      save.state.pipeline.youth_camps = save.state.pipeline.youth_camps ?? [];
    }
    save.manifest.save_version = 53;
    return save;
  },
};
