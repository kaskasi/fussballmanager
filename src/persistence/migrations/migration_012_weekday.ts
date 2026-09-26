import { MONDAY } from "../../sim/day-calendar.ts";
import type { SaveMigration } from "./index.ts";

export const migration012Weekday: SaveMigration = {
  id: "migration_012_weekday",
  apply: (save) => {
    save.state.weekday = save.state.weekday ?? MONDAY;
    save.state.match_played_this_week = save.state.match_played_this_week ?? false;
    save.manifest.save_version = 12;
    return save;
  },
};
