import { fullGameStoryState, normalizeStoryState } from "../../narrative/story-state.ts";
import type { SaveMigration } from "./index.ts";

/** PRD 19: career_phase, feature_curtain, choices, scheduled_payoffs on story_state. */
export const migration072CareerActs: SaveMigration = {
  id: "migration_072_career_acts",
  apply(save) {
    save.manifest.save_version = 72;
    const week = save.state.week ?? 1;
    const existing = save.state.pipeline?.story_state;
    if (existing) {
      const normalized = normalizeStoryState(existing, week);
      save.state.pipeline!.story_state = fullGameStoryState(normalized);
    }
    return save;
  },
};
