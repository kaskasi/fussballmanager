import { applyVeteranBackstory, seedFromPlayerId } from "../../player/veteran-backstory.ts";
import { PRO_DEBUT_AGE } from "../../player/season-stats.ts";
import type { SaveMigration } from "./index.ts";

/** Rebuild pre-career archives with calendar-aligned season indices (debut at 19). */
export const migration047ProSeasonCalendar: SaveMigration = {
  id: "migration_047_pro_season_calendar",
  apply(save) {
    save.players = save.players.map((player) => {
      if (player.age < PRO_DEBUT_AGE) return player;
      if (player.squad_status === "u17" || player.squad_status === "u19") return player;
      const stripped = {
        ...player,
        history: {
          ...player.history,
          growth: player.history.growth.filter((entry) => entry.season >= 1),
        },
      };
      return applyVeteranBackstory(stripped, seedFromPlayerId(player.id));
    });
    save.manifest.save_version = 47;
    return save;
  },
};
