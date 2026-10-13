import {
  defaultTutorialState,
  normalizeTutorialState,
  type StoryState,
  type TutorialState,
} from "../narrative/story-state.ts";
import type { TutorialScreenId } from "./tutorial-types.ts";

export function tutorialStateOf(story: StoryState): TutorialState {
  return normalizeTutorialState(story.tutorial);
}

export function isStepCompleted(story: StoryState, stepId: string): boolean {
  return tutorialStateOf(story).completed_step_ids.includes(stepId);
}

export function isScreenDismissed(story: StoryState, screen: TutorialScreenId): boolean {
  return tutorialStateOf(story).dismissed_screens.includes(screen);
}

export function markStepCompleted(story: StoryState, stepId: string): StoryState {
  const tutorial = tutorialStateOf(story);
  if (tutorial.completed_step_ids.includes(stepId)) return story;
  return {
    ...story,
    tutorial: {
      ...tutorial,
      completed_step_ids: [...tutorial.completed_step_ids, stepId],
    },
  };
}

export function dismissTutorialScreen(story: StoryState, screen: TutorialScreenId): StoryState {
  const tutorial = tutorialStateOf(story);
  if (tutorial.dismissed_screens.includes(screen)) return story;
  return {
    ...story,
    tutorial: {
      ...tutorial,
      dismissed_screens: [...tutorial.dismissed_screens, screen],
    },
  };
}

export function disableTutorialForSave(story: StoryState): StoryState {
  return {
    ...story,
    tutorial: { ...tutorialStateOf(story), disabled: true },
  };
}

export function resetTutorialProgress(story: StoryState): StoryState {
  return {
    ...story,
    tutorial: defaultTutorialState(),
  };
}

export interface TutorialGateInput {
  openingComplete: boolean;
  coachMarksEnabled: boolean;
  matchFlowActive: boolean;
  story: StoryState;
  screen: TutorialScreenId;
}

export function tutorialsAllowedForScreen(input: TutorialGateInput): boolean {
  if (!input.openingComplete) return false;
  if (!input.coachMarksEnabled) return false;
  if (input.matchFlowActive && input.screen !== "matchday") return false;
  const tutorial = tutorialStateOf(input.story);
  if (tutorial.disabled) return false;
  if (isScreenDismissed(input.story, input.screen)) return false;
  return true;
}
