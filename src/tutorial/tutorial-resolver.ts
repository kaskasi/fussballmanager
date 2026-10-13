import type { GameSession } from "../persistence/game-session.ts";
import { tutorialBodyForStep } from "./tutorial-copy.ts";
import { isStepCompleted, tutorialsAllowedForScreen, type TutorialGateInput } from "./tutorial-progress.ts";
import { stepPassesGate, stepsForScreen } from "./tutorial-registry.ts";
import type {
  ResolvedTutorialStep,
  TutorialScreenId,
  TutorialStepDefinition,
} from "./tutorial-types.ts";
import type { CoachTargetId } from "./tutorial-targets.ts";

function coachTargetForScreen(
  definition: TutorialStepDefinition,
  screen: TutorialScreenId,
): CoachTargetId | undefined {
  return definition.targetByScreen?.[screen] ?? definition.target;
}

export function resolveActiveTutorialStep(
  session: GameSession,
  screen: TutorialScreenId,
  coachMarksEnabled: boolean,
  matchFlowActive: boolean,
): ResolvedTutorialStep | null {
  const gate: TutorialGateInput = {
    openingComplete: session.storyState.opening_complete,
    coachMarksEnabled,
    matchFlowActive,
    story: session.storyState,
    screen,
  };
  if (!tutorialsAllowedForScreen(gate)) return null;
  if (screen === "matchday" && !matchFlowActive) return null;

  for (const definition of stepsForScreen(screen)) {
    if (isStepCompleted(session.storyState, definition.id)) continue;
    if (!stepPassesGate(definition, session)) continue;
    const { bodyKey, bodyParams } = tutorialBodyForStep(
      definition.id,
      session,
      definition.bodyKey,
    );
    const target = coachTargetForScreen(definition, screen);
    return {
      definition: target !== definition.target ? { ...definition, target } : definition,
      bodyKey,
      bodyParams,
    };
  }
  return null;
}

export function activeTutorialStepId(
  session: GameSession,
  screen: TutorialScreenId,
  coachMarksEnabled: boolean,
  matchFlowActive: boolean,
): string | null {
  return resolveActiveTutorialStep(session, screen, coachMarksEnabled, matchFlowActive)?.definition.id ?? null;
}
