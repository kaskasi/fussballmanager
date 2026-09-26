import type { SaveMigration } from "./index.ts";

export const migration011SquadSeasonStats: SaveMigration = {
  id: "migration_011_squad_season_stats",
  apply: (save) => {
    for (const player of save.players) {
      player.state.season_yellow_cards = player.state.season_yellow_cards ?? 0;
      player.state.season_tackles = player.state.season_tackles ?? 0;
      player.state.season_headers = player.state.season_headers ?? 0;
    }

    save.manifest.save_version = 11;
    return save;
  },
};
