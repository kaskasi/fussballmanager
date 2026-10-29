import { asTeamId } from "@fussballmanager/shared";
import { reassignClashingIds } from "../../player/player-ids.ts";
import { PYRAMID } from "../../sim/league-pyramid.ts";
import type { Player } from "../../types/player.ts";
import { generateWorld, worldCareerClubId } from "../../world/world-generator.ts";
import type { SaveMigration } from "./index.ts";

/** Players generated for season 1, moved to `season`: birth year and contract follow the calendar. */
function shiftToSeason(player: Player, season: number): Player {
  const shift = season - 1;
  if (shift <= 0) return player;
  const year = Number.parseInt(player.birth.date.slice(0, 4), 10);
  return {
    ...player,
    birth: { ...player.birth, date: `${year + shift}${player.birth.date.slice(4)}` },
    contract: player.contract ? { ...player.contract, until_season: player.contract.until_season + shift } : null,
    history: {
      ...player.history,
      clubs: player.history.clubs.map((entry) => {
        const row = entry as { from_season?: unknown };
        return typeof row.from_season === "number" ? { ...entry, from_season: row.from_season + shift } : entry;
      }),
    },
  };
}

/**
 * PRD 32 slice 2: add Meisterliga, Meisterliga 2 and Nationalliga (clubs,
 * pools, rosters) to a save that only has the northern tiers. The clubs come
 * from the save's own seeds, so they match a fresh world of the same seed.
 */
export const migration102LeaguePyramid: SaveMigration = {
  id: "migration_102_league_pyramid",
  apply(save) {
    const world = save.state.world;
    const league = save.state.league;
    const national = PYRAMID.filter((division) => !division.careerStart);
    if (world && world.generation_version > 0 && league && world.clubs.length > 0) {
      const known = new Set(world.clubs.map((club) => club.id));
      const generated = generateWorld(save.rng_state.master_seed, world.club_seed ?? world.world_seed);
      const newClubs = generated.clubs.filter(
        (club) => !known.has(club.id) && national.some((division) => division.id === club.division_id),
      );
      if (newClubs.length > 0) {
        world.clubs = [...world.clubs, ...newClubs];
        const pools = { ...(league.league_pools ?? {}) } as NonNullable<typeof league.league_pools>;
        for (const division of national) {
          pools[division.id] = (generated.league_pools[division.id] ?? []).map(asTeamId);
        }
        league.league_pools = pools;
        const newClubIds = new Set(newClubs.map((club) => worldCareerClubId(club.id)));
        const pipeline = save.state.pipeline;
        if (pipeline) {
          const rivals = pipeline.rival_players ?? [];
          const taken = new Set<string>([
            ...save.players.map((player) => player.id),
            ...rivals.map((player) => player.id),
            ...(Array.isArray(save.retired)
              ? save.retired.flatMap((record) => {
                  const id = (record as { id?: unknown }).id;
                  return typeof id === "string" ? [id] : [];
                })
              : []),
          ]);
          const arrivals = generated.players
            .filter((player) => player.club_id !== null && newClubIds.has(player.club_id))
            .map((player) => shiftToSeason(player, save.state.season));
          pipeline.rival_players = [...rivals, ...reassignClashingIds(arrivals, taken)];
        }
      }
    }
    save.manifest.save_version = 102;
    return save;
  },
};
