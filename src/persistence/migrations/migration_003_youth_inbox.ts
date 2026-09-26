import { generateWeeklyInbox } from "../../youth/decision-inbox.ts";
import { defaultPipelineState } from "../pipeline-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration003YouthInbox: SaveMigration = {
  id: "migration_003_youth_inbox",
  apply: (save) => {
    if (!save.state.pipeline) {
      save.state.pipeline = defaultPipelineState();
    }
    save.state.pipeline.youth_inbox = generateWeeklyInbox(
      save.players,
      save.state.week,
      save.rng_state.master_seed,
    );
    save.manifest.save_version = 3;
    return save;
  },
};
