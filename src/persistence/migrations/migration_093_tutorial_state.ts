import { defaultTutorialState, normalizeStoryState } from "../../narrative/story-state.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 25: story_state.tutorial for coach marks. */
export const migration093TutorialState: SaveMigration = {
  id: "migration_093_tutorial_state",
  apply(save) {
    const pipeline = save.state.pipeline;
    if (pipeline?.story_state) {
      const normalized = normalizeStoryState(pipeline.story_state, save.state.week ?? 1);
      pipeline.story_state = {
        ...normalized,
        tutorial: normalized.tutorial ?? defaultTutorialState(),
      };
    }
    save.manifest.save_version = 93;
    return save;
  },
};
