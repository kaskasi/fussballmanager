import { normalizeStoryState } from "../../narrative/story-state.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 28: story_state.press (relationship, conference pair, crisis ladder) + morale_low_weeks. */
export const migration099PressConferences: SaveMigration = {
  id: "migration_099_press_conferences",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.story_state) {
      pipeline.story_state = normalizeStoryState(pipeline.story_state, save.state.week ?? 1);
    }
    save.manifest.save_version = 99;
    return save;
  },
};
