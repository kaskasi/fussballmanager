import type { SaveMigration } from "./index.ts";

export const migration009CareerLeagueSync: SaveMigration = {
  id: "migration_009_career_league_sync",
  apply: (save) => {
    for (const player of save.players) {
      player.state.season_apps = player.state.season_apps ?? 0;
      player.state.season_goals = player.state.season_goals ?? 0;
      player.state.season_assists = player.state.season_assists ?? 0;
    }
    if (save.state.league) {
      save.state.league.career_player_stats = save.state.league.career_player_stats ?? [];
    }
    save.manifest.save_version = 9;
    return save;
  },
};
