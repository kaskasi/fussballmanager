import type { SaveGame } from "../savegame-model.ts";
import type { SaveMigration } from "./index.ts";
import { pendingFromExistingInjury } from "../../medical/injury-care.ts";

/** Move undiagnosed-looking injuries into waiting room until doctor exam. */
export const migration092MedicalCareFlow: SaveMigration = {
  id: "migration_092_medical_care_flow",
  apply(save: SaveGame) {
    const pipeline = save.state.pipeline;
    if (!pipeline) {
      save.manifest.save_version = 92;
      return save;
    }
    pipeline.medical_state = pipeline.medical_state ?? { pending_diagnoses: [] };
    const pending = [...(pipeline.medical_state.pending_diagnoses ?? [])];
    const pendingIds = new Set(pending.map((row) => row.player_id));
    const masterSeed = save.rng_state?.master_seed ?? 0;
    const clubId = save.manifest.player_club_id;
    const players = save.players ?? [];
    for (let index = 0; index < players.length; index++) {
      const player = players[index]!;
      if (player.club_id !== clubId || player.squad_status !== "pro") continue;
      const injury = player.state.injury;
      if (!injury || pendingIds.has(player.id)) continue;
      pending.push(pendingFromExistingInjury(player, injury, masterSeed));
      players[index] = { ...player, state: { ...player.state, injury: null } };
      pendingIds.add(player.id);
    }
    pipeline.medical_state.pending_diagnoses = pending;
    save.players = players;
    save.manifest.save_version = 92;
    return save;
  },
};
