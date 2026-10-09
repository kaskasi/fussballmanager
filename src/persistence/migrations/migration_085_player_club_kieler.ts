import {
  NORDSTERN_CLUB_ID,
  NORDSTERN_TEAM_ID,
  type WorldClub,
} from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

const KIELER_NAME = "Kieler FC";
const KIELER_SHORT = "KFC";
const KIELER_PLACE = "Kiel";

function isLegacyNordsternClub(club: WorldClub): boolean {
  if (club.id === NORDSTERN_TEAM_ID || club.id === NORDSTERN_CLUB_ID) return true;
  return /nordstern/i.test(club.name);
}

function renamePlayerClub(club: WorldClub): WorldClub {
  if (!isLegacyNordsternClub(club)) return club;
  return {
    ...club,
    name: KIELER_NAME,
    short_name: KIELER_SHORT,
    place: club.place || KIELER_PLACE,
  };
}

/** Player club display identity: Nordstern → Kieler FC (world + tables). */
export const migration085PlayerClubKieler: SaveMigration = {
  id: "migration_085_player_club_kieler",
  apply(save) {
    const world = save.state.world;
    if (world?.clubs?.length) {
      world.clubs = world.clubs.map((club) =>
        renamePlayerClub(club as WorldClub),
      ) as WorldClub[];
    }
    save.manifest.save_version = 85;
    return save;
  },
};
