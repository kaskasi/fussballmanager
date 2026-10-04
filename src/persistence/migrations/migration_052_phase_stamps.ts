import type { Player } from "../../types/player.ts";
import { seedPhaseStamps } from "../../development/ability-stamps.ts";
import type { SaveMigration } from "./index.ts";

function migratePlayer(player: Player): Player {
  const withFields: Player = {
    ...player,
    stamps: Array.isArray(player.stamps) ? player.stamps : [],
    state: {
      ...player.state,
      scoring_streak: player.state.scoring_streak ?? 0,
      last_match_goals: player.state.last_match_goals ?? 0,
    },
  };
  return seedPhaseStamps(withFields, 1, 1);
}

/** F2.8 phase curses + signed catalog; preserves existing players. */
export const migration052PhaseStamps: SaveMigration = {
  id: "migration_052_phase_stamps",
  apply(save) {
    save.players = save.players.map(migratePlayer);
    save.retired = (save.retired as Player[]).map(migratePlayer);
    const rivals = save.state.pipeline?.rival_players;
    if (rivals) {
      save.state.pipeline!.rival_players = rivals.map(migratePlayer);
    }
    save.manifest.save_version = 52;
    return save;
  },
};
