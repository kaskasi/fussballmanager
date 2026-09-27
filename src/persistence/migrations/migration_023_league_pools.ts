import { defaultLeagueState, normalizeLeagueState } from "../league-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration023LeaguePools: SaveMigration = {
  id: "migration_023_league_pools",
  apply: (save) => {
    save.state.league = normalizeLeagueState(save.state.league ?? defaultLeagueState());
    save.manifest.save_version = 23;
    return save;
  },
};
