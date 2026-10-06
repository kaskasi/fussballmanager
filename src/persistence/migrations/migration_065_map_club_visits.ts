import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { SaveMigration } from "./index.ts";

/** Map club visits: visited_club_ids synced from discovered_club_ids (PRD 04.5). */
export const migration065MapClubVisits: SaveMigration = {
  id: "migration_065_map_club_visits",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board?.discovery) {
      const discovered = board.discovery.discovered_club_ids ?? [];
      save.state.pipeline!.scout_board = {
        ...board,
        discovery: {
          ...board.discovery,
          visited_club_ids: [...new Set([...(board.discovery.visited_club_ids ?? []), ...discovered])],
        },
      };
    }
    save.manifest.save_version = 65;
    return save;
  },
};
