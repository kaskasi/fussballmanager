import { DEFAULT_ASSISTANT_DELEGATION } from "../../staff/assistant-delegation.ts";
import type { SaveMigration } from "./index.ts";

export const migration041AssistantDelegation: SaveMigration = {
  id: "migration_041_assistant_delegation",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    if (!pipeline.assistant_delegation) {
      pipeline.assistant_delegation = { ...DEFAULT_ASSISTANT_DELEGATION };
    }
    save.manifest.save_version = 41;
    return save;
  },
};
