import { useEffect, useMemo } from "react";
import { useGameSession } from "../session/GameSessionContext.tsx";
import { activeTutorialStepId, type TutorialScreenId } from "../../tutorial/index.ts";
import { useTutorialUi } from "./TutorialUiContext.tsx";

/** Switches screen tab while a tab-specific coach step is active. */
export function useTutorialTabFocus<T extends string>(
  screen: TutorialScreenId,
  stepId: string,
  tab: T,
  setTab: (value: T) => void,
): void {
  const { coachMarksEnabled, matchFlowActive } = useTutorialUi();
  const { session } = useGameSession();
  const activeId = useMemo(
    () => activeTutorialStepId(session, screen, coachMarksEnabled, matchFlowActive),
    [session, screen, coachMarksEnabled, matchFlowActive],
  );

  useEffect(() => {
    if (activeId === stepId) setTab(tab);
  }, [activeId, stepId, tab, setTab]);
}
