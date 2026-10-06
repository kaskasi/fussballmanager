import { extractPlaceFromClubName } from "../../scouting/scout-map-geo.ts";
import { generateClubs, type WorldClub } from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

function backfillClubPlace(club: WorldClub, fromSeed: Map<string, WorldClub>): WorldClub {
  if (club.place) return club;
  const seeded = fromSeed.get(club.id);
  if (seeded?.place) return { ...club, place: seeded.place };
  const parsed = extractPlaceFromClubName(club.name);
  if (parsed) return { ...club, place: parsed };
  return { ...club, place: club.region };
}

/** Add WGS84-backed `place` on world clubs for scout map placement. */
export const migration063ClubPlaceGeo: SaveMigration = {
  id: "migration_063_club_place_geo",
  apply(save) {
    const world = save.state.world;
    if (world?.clubs?.length) {
      const seeded = new Map(
        generateClubs(world.world_seed).map((club) => [club.id, club] as const),
      );
      world.clubs = world.clubs.map((club) =>
        backfillClubPlace(club as WorldClub, seeded),
      ) as WorldClub[];
    }
    save.manifest.save_version = 63;
    return save;
  },
};
