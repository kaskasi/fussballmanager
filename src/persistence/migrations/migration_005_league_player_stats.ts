import type { SaveMigration } from "./index.ts";

export const migration005LeaguePlayerStats: SaveMigration = {
  id: "migration_005_league_player_stats",
  apply: (save) => {
    if (save.state.league && !save.state.league.player_stats) {
      save.state.league.player_stats = [];
    }
    save.manifest.save_version = 5;
    return save;
  },
};
