import { simulatePartialDivisionSeason, divisionSeasonSeed } from "../../sim/division-matchday.ts";
import { pyramidDivisionIds } from "../../sim/league-pyramid.ts";
import { totalSeasonMatchdays } from "../league-state.ts";
import type { SaveMigration } from "./index.ts";

/**
 * PRD 32 slice 3: every division keeps its own live results
 * (`league.division_results`). A save from the middle of a season gets the
 * matchdays already played, with the seed the weekly sim uses from now on.
 */
export const migration103LiveDivisionTables: SaveMigration = {
  id: "migration_103_live_division_tables",
  apply(save) {
    const league = save.state.league;
    if (league?.league_pools) {
      const rivals = save.state.pipeline?.rival_players ?? [];
      const results = { ...(league.division_results ?? {}) };
      for (const divisionId of pyramidDivisionIds()) {
        if (divisionId === league.division_id || results[divisionId]?.length) continue;
        const clubIds = league.league_pools[divisionId] ?? [];
        const total = totalSeasonMatchdays({ club_ids: clubIds, meetings_per_opponent: league.meetings_per_opponent });
        const played = league.season_complete ? total : Math.max(0, league.matchday - 1);
        results[divisionId] =
          clubIds.length < 2 || played === 0
            ? []
            : simulatePartialDivisionSeason(
                clubIds,
                league.meetings_per_opponent,
                played,
                divisionSeasonSeed(save.rng_state.master_seed, save.state.season, divisionId),
                rivals,
              );
      }
      league.division_results = results;
    }
    save.manifest.save_version = 103;
    return save;
  },
};
