import { withPeakCa } from "../../development/retirement.ts";
import { normalizeRetiredPlayers } from "../../development/retired-players.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 31: `retired.json` holds retirement records; every player gets `state.peak_ca`. */
export const migration101Retirement: SaveMigration = {
  id: "migration_101_retirement",
  apply(save) {
    save.retired = normalizeRetiredPlayers(Array.isArray(save.retired) ? save.retired : []);
    save.players = save.players.map(withPeakCa);
    const pipeline = save.state.pipeline;
    if (pipeline?.rival_players) pipeline.rival_players = pipeline.rival_players.map(withPeakCa);
    save.manifest.save_version = 101;
    return save;
  },
};
