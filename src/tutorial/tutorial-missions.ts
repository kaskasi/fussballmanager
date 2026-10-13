import type { StoryState } from "../narrative/story-state.ts";
import type { TutorialStepId } from "./tutorial-types.ts";
import { isStepCompleted } from "./tutorial-progress.ts";

export interface TutorialMissionDefinition {
  id: string;
  labelKey: string;
  stepIds: readonly TutorialStepId[];
}

export const TUTORIAL_MISSIONS: readonly TutorialMissionDefinition[] = [
  {
    id: "training_day",
    labelKey: "tutorial.mission.trainingDay",
    stepIds: ["hub.open_training", "training.set_plan", "training.use_next"],
  },
  {
    id: "import_plan",
    labelKey: "tutorial.mission.importPlan",
    stepIds: ["training.load_preset"],
  },
  {
    id: "export_plan",
    labelKey: "tutorial.mission.exportPlan",
    stepIds: ["training.save_preset"],
  },
  {
    id: "answer_board",
    labelKey: "tutorial.mission.answerBoard",
    stepIds: ["hub.answer_board"],
  },
  {
    id: "progress_time",
    labelKey: "tutorial.mission.progressTime",
    stepIds: ["hub.progress_time"],
  },
  {
    id: "growth_widgets",
    labelKey: "tutorial.mission.growthWidgets",
    stepIds: ["hub.heatmaps", "hub.top_development"],
  },
];

export function isMissionComplete(story: StoryState, mission: TutorialMissionDefinition): boolean {
  return mission.stepIds.every((stepId) => isStepCompleted(story, stepId));
}
