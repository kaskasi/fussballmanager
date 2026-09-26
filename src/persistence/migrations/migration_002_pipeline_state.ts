import { defaultPipelineState } from "../pipeline-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration002PipelineState: SaveMigration = {
  id: "migration_002_pipeline_state",
  apply: (save) => {
    if (!save.state.pipeline) {
      save.state.pipeline = defaultPipelineState();
    }
    save.manifest.save_version = 2;
    return save;
  },
};
