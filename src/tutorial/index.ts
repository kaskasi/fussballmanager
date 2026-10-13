export { COACH_TARGET, type CoachTargetId } from "./tutorial-targets.ts";
export {
  disableTutorialForSave,
  dismissTutorialScreen,
  isScreenDismissed,
  isStepCompleted,
  markStepCompleted,
  resetTutorialProgress,
  tutorialsAllowedForScreen,
} from "./tutorial-progress.ts";
export { resolveActiveTutorialStep } from "./tutorial-resolver.ts";
export { TUTORIAL_STEPS } from "./tutorial-registry.ts";
export { TUTORIAL_MISSIONS, isMissionComplete } from "./tutorial-missions.ts";
export { phase1DeskTrackComplete } from "./tutorial-phase-gates.ts";
export type {
  ResolvedTutorialStep,
  TutorialScreenId,
  TutorialStepDefinition,
  TutorialStepId,
} from "./tutorial-types.ts";
