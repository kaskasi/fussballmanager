import { normalizeStoryState } from "../../narrative/story-state.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 24 / ADR 0005: Story Mode act fields (unlocks, transition, legends) on story_state. */
export const migration097StoryModeActs: SaveMigration = {
  id: "migration_097_story_mode_acts",
  apply(save) {
    const existing = save.state.pipeline?.story_state;
    if (existing) {
      save.state.pipeline!.story_state = normalizeStoryState(existing, save.state.week ?? 1);
    }
    save.manifest.save_version = 97;
    return save;
  },
};
