import { deriveClubKitColors } from "../../world/club-kit.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

function withKit(club: WorldClub, masterSeed: number, clubIndex: number): WorldClub {
  if (club.kit?.primary && club.kit?.secondary) {
    return club;
  }
  return {
    ...club,
    kit: deriveClubKitColors(masterSeed, club.id, clubIndex),
  };
}

export const migration095ClubKits: SaveMigration = {
  id: "migration_095_club_kits",
  apply(save) {
    const masterSeed = save.rng_state.master_seed;
    const world = save.state.world;
    if (world?.clubs?.length) {
      save.state.world = {
        ...world,
        clubs: world.clubs.map((club, index) =>
          withKit(club as WorldClub, masterSeed, index),
        ) as WorldClub[],
      };
    }
    save.manifest.save_version = 95;
    return save;
  },
};
