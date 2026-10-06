import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { applyHomeZoneBootstrap } from "../../scouting/scout-region-unlock.ts";
import { worldCareerClubId, type WorldClub } from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

/** Bootstrap home map zone to tier 3 for existing careers (PRD 04.5). */
export const migration066HomeZoneScout: SaveMigration = {
  id: "migration_066_home_zone_scout",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    const playerClubId = save.state.league?.player_club_id;
    const worldClubs = (save.state.world?.clubs ?? []) as WorldClub[];
    const playerClub =
      worldClubs.find((club) => worldCareerClubId(club.id) === playerClubId) ??
      worldClubs.find((club) => club.id === playerClubId) ??
      null;

    if (board?.discovery) {
      save.state.pipeline!.scout_board = {
        ...board,
        discovery: applyHomeZoneBootstrap(board.discovery, playerClub),
      };
    }
    save.manifest.save_version = 66;
    return save;
  },
};
