import type { Player } from "../../types/player.ts";
import { discoveryFromLegacyTargets, normalizeDiscovery } from "../../scouting/scout-discovery.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

function allRivalPlayers(save: Parameters<SaveMigration["apply"]>[0]): Player[] {
  const pipeline = save.state.pipeline;
  const rivals = pipeline?.rival_players ?? [];
  return rivals as Player[];
}

export const migration060ScoutDiscovery: SaveMigration = {
  id: "migration_060_scout_discovery",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board) {
      const rivals = allRivalPlayers(save);
      const hasPool = (board.discovery?.scout_pool?.length ?? 0) > 0;
      const discovery = hasPool
        ? normalizeDiscovery(board.discovery)
        : discoveryFromLegacyTargets(board.targets ?? {}, rivals);
      save.state.pipeline!.scout_board = {
        ...board,
        discovery,
        active_club_scout: board.active_club_scout ?? null,
        active_region_scout: board.active_region_scout ?? null,
      };
    }
    save.manifest.save_version = 60;
    return save;
  },
};
