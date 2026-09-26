import { defaultLeagueState, LEAGUE_MEETINGS_PER_OPPONENT } from "../league-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration006LeagueSeasonMode: SaveMigration = {
  id: "migration_006_league_season_mode",
  apply: (save) => {
    if (!save.state.league) {
      save.state.league = defaultLeagueState();
    } else {
      save.state.league.meetings_per_opponent =
        save.state.league.meetings_per_opponent ?? LEAGUE_MEETINGS_PER_OPPONENT;
      save.state.league.season_complete = save.state.league.season_complete ?? false;
      save.state.league.player_stats = save.state.league.player_stats ?? [];
      // Old saves cycled every 5 matchdays — reset inflated tables.
      const maxMatchdays = (save.state.league.club_ids.length - 1) * save.state.league.meetings_per_opponent;
      const played = save.state.league.results.length / (save.state.league.club_ids.length / 2);
      if (played > maxMatchdays) {
        save.state.league.results = [];
        save.state.league.player_stats = [];
        save.state.league.matchday = 1;
        save.state.league.season_complete = false;
      }
    }
    save.manifest.save_version = 6;
    return save;
  },
};
