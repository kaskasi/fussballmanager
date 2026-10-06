import type { SaveGame } from "../savegame-model.ts";
import { defaultCampLeaderProfile } from "../../youth/camp-leader-hire.ts";
import { normalizeYouthCamps, type YouthCamp } from "../../youth/satellite-camps.ts";
import type { SaveMigration } from "./index.ts";

function migrateCamp(camp: YouthCamp, masterSeed: number): YouthCamp {
  if (camp.leader_hire && camp.leader_hire !== "none") {
    return normalizeYouthCamps([camp])[0]!;
  }
  if (camp.staffed) {
    const leader = defaultCampLeaderProfile(camp.id, masterSeed);
    return {
      id: camp.id,
      purchased_season: camp.purchased_season,
      staffed: true,
      leader_hire: "hired",
      leader,
    };
  }
  return {
    id: camp.id,
    purchased_season: camp.purchased_season,
    staffed: false,
    leader_hire: "none",
  };
}

/** Camp-Leiter: agency hire state + backfill legacy staffed toggle. */
export const migration058CampLeaderHire: SaveMigration = {
  id: "migration_058_camp_leader_hire",
  apply(save: SaveGame) {
    const masterSeed = save.rng_state?.master_seed ?? 1;
    const camps = save.state.pipeline?.youth_camps ?? [];
    save.state.pipeline!.youth_camps = normalizeYouthCamps(camps.map((camp) => migrateCamp(camp, masterSeed)));
    save.manifest.save_version = 58;
    return save;
  },
};
