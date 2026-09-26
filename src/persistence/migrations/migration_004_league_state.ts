import { defaultLeagueState } from "../league-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration004LeagueState: SaveMigration = {
  id: "migration_004_league_state",
  apply: (save) => {
    save.state.league = save.state.league ?? defaultLeagueState();
    save.manifest.save_version = 4;
    return save;
  },
};
