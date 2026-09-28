import { generateStoryCast } from "../../narrative/cast.ts";
import { applySurvivalObjectivesToBoard } from "../../narrative/season-objectives.ts";
import {
  defaultStoryState,
  normalizeStoryState,
  type CareerOrigin,
} from "../../narrative/story-state.ts";
import type { BoardState } from "../../board/board-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration039StoryState: SaveMigration = {
  id: "migration_039_story_state",
  apply: (save) => {
    const week = save.state.week;
    const masterSeed = save.rng_state.master_seed;
    const existing = save.state.pipeline?.story_state;
    const story_state = existing
      ? normalizeStoryState(existing, week)
      : {
          ...defaultStoryState(week),
          cast: generateStoryCast(masterSeed),
          opening_complete: true,
          career_origin: "community_takeover" as CareerOrigin,
        };
    if (save.state.pipeline) {
      save.state.pipeline.story_state = story_state;
      const board = save.state.pipeline.board as BoardState | undefined;
      if (board && story_state.active_arc === "relegation_battle") {
        save.state.pipeline.board = {
          ...board,
          objectives: applySurvivalObjectivesToBoard(
            board.objectives,
            save.state.season,
            board.employer_club_id,
          ),
        };
      }
    }
    save.manifest.save_version = 39;
    return save;
  },
};
