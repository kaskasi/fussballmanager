import { isTrainingSlotEmpty } from "../development/training-units.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { pendingInboxItems } from "../youth/decision-inbox.ts";
import { usesTrainingNextNexus } from "../sim/training-next.ts";
import { isStepCompleted } from "./tutorial-progress.ts";
import { COACH_TARGET } from "./tutorial-targets.ts";
import type { TutorialStepDefinition } from "./tutorial-types.ts";
import { TUTORIAL_STEPS_PHASES_2_4 } from "./tutorial-steps-phases-2-4.ts";
import { TUTORIAL_TRAINING_INDIVIDUAL_TAB } from "./tutorial-steps-tabs.ts";

function planHasEmptySlot(session: GameSession): boolean {
  return session.trainingPlan.some(isTrainingSlotEmpty);
}

function planHasConfiguredSlot(session: GameSession): boolean {
  return session.trainingPlan.some((slot) => !isTrainingSlotEmpty(slot));
}

function hasPendingBoardInbox(session: GameSession): boolean {
  return pendingInboxItems(session.youthInbox, session.players).some(
    (item) => item.kind === "story_board",
  );
}

/** Ordered steps per screen — first incomplete step wins. */
export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    id: "hub.intro_origin",
    screen: "hub",
    mode: "panel",
    titleKey: "tutorial.hub.introOrigin.title",
    bodyKey: "tutorial.origin.recap.community_takeover",
  },
  {
    id: "hub.click_next",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.clickNext.title",
    bodyKey: "tutorial.hub.clickNext.body",
    target: COACH_TARGET.headerNext,
    completeOnTargetClick: true,
  },
  {
    id: "hub.open_training",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.openTraining.title",
    bodyKey: "tutorial.hub.openTraining.body",
    target: COACH_TARGET.hubTrainingCalendar,
    completeOnTargetClick: true,
    when: (session) => usesTrainingNextNexus(session.storyState),
  },
  {
    id: "training.set_plan",
    screen: "training",
    mode: "spotlight",
    titleKey: "tutorial.training.setPlan.title",
    bodyKey: "tutorial.training.setPlan.body",
    target: COACH_TARGET.trainingPickSlot,
    when: (session) =>
      usesTrainingNextNexus(session.storyState) && planHasEmptySlot(session),
  },
  {
    id: "training.today_sessions",
    screen: "training",
    mode: "spotlight",
    titleKey: "tutorial.training.todaySessions.title",
    bodyKey: "tutorial.training.todaySessions.body",
    target: COACH_TARGET.trainingTodayColumn,
    when: (session) =>
      usesTrainingNextNexus(session.storyState) &&
      isStepCompleted(session.storyState, "training.set_plan"),
  },
  {
    id: "training.use_next",
    screen: "training",
    mode: "spotlight",
    titleKey: "tutorial.training.useNext.title",
    bodyKey: "tutorial.training.useNext.body",
    target: COACH_TARGET.headerNext,
    completeOnTargetClick: true,
    when: (session) =>
      usesTrainingNextNexus(session.storyState) &&
      isStepCompleted(session.storyState, "training.today_sessions") &&
      session.trainingUnitsCompleted === 0,
  },
  {
    id: "training.load_preset",
    screen: "training",
    mode: "spotlight",
    titleKey: "tutorial.training.loadPreset.title",
    bodyKey: "tutorial.training.loadPreset.body",
    target: COACH_TARGET.trainingPlanPresets,
    completeOnTargetClick: true,
    when: (session) =>
      usesTrainingNextNexus(session.storyState) &&
      isStepCompleted(session.storyState, "training.use_next") &&
      planHasEmptySlot(session),
  },
  {
    id: "training.save_preset",
    screen: "training",
    mode: "spotlight",
    titleKey: "tutorial.training.savePreset.title",
    bodyKey: "tutorial.training.savePreset.body",
    target: COACH_TARGET.trainingPlanPresets,
    completeOnTargetClick: true,
    when: (session) =>
      usesTrainingNextNexus(session.storyState) &&
      isStepCompleted(session.storyState, "training.load_preset") &&
      planHasConfiguredSlot(session),
  },
  TUTORIAL_TRAINING_INDIVIDUAL_TAB,
  {
    id: "hub.answer_board",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.answerBoard.title",
    bodyKey: "tutorial.hub.answerBoard.body",
    target: COACH_TARGET.hubPostfach,
    when: (session) =>
      isStepCompleted(session.storyState, "training.save_preset") && hasPendingBoardInbox(session),
  },
  {
    id: "hub.progress_time",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.progressTime.title",
    bodyKey: "tutorial.hub.progressTime.body",
    target: COACH_TARGET.headerNext,
    completeOnTargetClick: true,
    when: (session) => {
      if (!isStepCompleted(session.storyState, "training.save_preset")) return false;
      if (hasPendingBoardInbox(session)) {
        return isStepCompleted(session.storyState, "hub.answer_board");
      }
      return true;
    },
  },
  {
    id: "hub.heatmaps",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.heatmaps.title",
    bodyKey: "tutorial.hub.heatmaps.body",
    target: COACH_TARGET.hubHeatmaps,
    when: (session) => isStepCompleted(session.storyState, "hub.progress_time"),
  },
  {
    id: "hub.top_development",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.topDevelopment.title",
    bodyKey: "tutorial.hub.topDevelopment.body",
    target: COACH_TARGET.hubTopDevelopment,
    completeOnTargetClick: true,
    when: (session) => isStepCompleted(session.storyState, "hub.heatmaps"),
  },
  ...TUTORIAL_STEPS_PHASES_2_4,
];

export function stepsForScreen(screen: TutorialStepDefinition["screen"]): TutorialStepDefinition[] {
  return TUTORIAL_STEPS.filter(
    (step) => step.screen === screen || step.alsoOnScreens?.includes(screen),
  );
}

export function stepPassesGate(step: TutorialStepDefinition, session: GameSession): boolean {
  return step.when ? step.when(session) : true;
}
