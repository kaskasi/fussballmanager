import { useCallback, useEffect, useMemo, useState } from "react";
import type { Screen } from "../shell/types.ts";
import { useGameSession } from "../session/GameSessionContext.tsx";
import { hasOpenKickerItem } from "../../inbox/kicker-inbox.ts";
import { pendingInboxItems } from "../../youth/decision-inbox.ts";
import {
  dismissTutorialScreen,
  isStepCompleted,
  markStepCompleted,
  resolveActiveTutorialStep,
  type TutorialScreenId,
} from "../../tutorial/index.ts";
import { TutorialOverlay } from "./TutorialOverlay.tsx";

function toTutorialScreen(screen: Screen): TutorialScreenId {
  return screen as TutorialScreenId;
}

export function TutorialCoachLayer({
  screen,
  coachMarksEnabled,
  matchFlowActive,
  onDisableCoachMarksGlobally,
}: {
  screen: Screen;
  coachMarksEnabled: boolean;
  matchFlowActive: boolean;
  onDisableCoachMarksGlobally: () => void;
}) {
  const { session, patchSession } = useGameSession();
  const [snoozeStepId, setSnoozeStepId] = useState<string | null>(null);
  const [dismissScreenChecked, setDismissScreenChecked] = useState(false);

  const tutorialScreen = toTutorialScreen(screen);

  useEffect(() => {
    setSnoozeStepId(null);
    setDismissScreenChecked(false);
  }, [screen]);

  useEffect(() => {
    if (screen !== "training") return;
    if (!isStepCompleted(session.storyState, "hub.open_training")) {
      patchSession((current) => ({
        ...current,
        storyState: markStepCompleted(current.storyState, "hub.open_training"),
      }));
    }
  }, [screen, session.storyState, patchSession]);

  useEffect(() => {
    if (isStepCompleted(session.storyState, "hub.answer_board")) return;
    const boardItems = session.youthInbox.items.filter((item) => item.kind === "story_board");
    if (boardItems.length === 0) return;
    const allResolved = boardItems.every((item) =>
      session.youthInbox.resolvedIds.includes(item.id),
    );
    if (!allResolved) return;
    patchSession((current) => ({
      ...current,
      storyState: markStepCompleted(current.storyState, "hub.answer_board"),
    }));
  }, [session.youthInbox, session.storyState, patchSession]);

  useEffect(() => {
    if (isStepCompleted(session.storyState, "postfach.resolve_decision")) return;
    if (!isStepCompleted(session.storyState, "postfach.inbox_queue")) return;
    if (pendingInboxItems(session.youthInbox, session.players).length === 0) {
      patchSession((current) => ({
        ...current,
        storyState: markStepCompleted(current.storyState, "postfach.resolve_decision"),
      }));
    }
  }, [session.youthInbox, session.players, session.storyState, patchSession]);

  useEffect(() => {
    if (isStepCompleted(session.storyState, "postfach.treter_thursday")) return;
    if (!isStepCompleted(session.storyState, "postfach.resolve_decision")) return;
    const kickerId = `kicker-${session.season}-${session.week}`;
    if (session.youthInbox.resolvedIds.includes(kickerId)) {
      patchSession((current) => ({
        ...current,
        storyState: markStepCompleted(current.storyState, "postfach.treter_thursday"),
      }));
      return;
    }
    if (!hasOpenKickerItem(session.youthInbox, session.season, session.week)) {
      patchSession((current) => ({
        ...current,
        storyState: markStepCompleted(current.storyState, "postfach.treter_thursday"),
      }));
    }
  }, [session.season, session.week, session.youthInbox, session.storyState, patchSession]);

  useEffect(() => {
    if (screen !== "postfach") return;
    if (isStepCompleted(session.storyState, "postfach.inbox_queue")) return;
    patchSession((current) => ({
      ...current,
      storyState: markStepCompleted(current.storyState, "postfach.inbox_queue"),
    }));
  }, [screen, session.storyState, patchSession]);

  const effectiveScreen = matchFlowActive ? "matchday" : tutorialScreen;

  const activeStep = useMemo(() => {
    if (snoozeStepId) return null;
    return resolveActiveTutorialStep(
      session,
      effectiveScreen,
      coachMarksEnabled,
      matchFlowActive,
    );
  }, [session, effectiveScreen, coachMarksEnabled, matchFlowActive, snoozeStepId]);

  const completeStep = useCallback(
    (stepId: string) => {
      patchSession((current) => ({
        ...current,
        storyState: markStepCompleted(current.storyState, stepId),
      }));
      setDismissScreenChecked(false);
      setSnoozeStepId(null);
    },
    [patchSession],
  );

  const handleContinue = useCallback(() => {
    if (!activeStep) return;
    if (dismissScreenChecked) {
      patchSession((current) => ({
        ...current,
        storyState: dismissTutorialScreen(current.storyState, tutorialScreen),
      }));
    }
    completeStep(activeStep.definition.id);
  }, [activeStep, completeStep, dismissScreenChecked, patchSession, tutorialScreen]);

  const handleLater = useCallback(() => {
    if (activeStep) setSnoozeStepId(activeStep.definition.id);
  }, [activeStep]);

  if (!activeStep) return null;

  return (
    <TutorialOverlay
      step={activeStep}
      storyState={session.storyState}
      onContinue={handleContinue}
      onDismissScreen={() => {
        patchSession((current) => ({
          ...current,
          storyState: dismissTutorialScreen(current.storyState, tutorialScreen),
        }));
      }}
      onDisableAll={onDisableCoachMarksGlobally}
      onLater={handleLater}
      dismissScreenChecked={dismissScreenChecked}
      onDismissScreenCheckedChange={setDismissScreenChecked}
    />
  );
}
