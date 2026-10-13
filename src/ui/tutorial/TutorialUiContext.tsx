import { createContext, useContext, type ReactNode } from "react";

export interface TutorialUiState {
  coachMarksEnabled: boolean;
  matchFlowActive: boolean;
}

const TutorialUiContext = createContext<TutorialUiState>({
  coachMarksEnabled: true,
  matchFlowActive: false,
});

export function TutorialUiProvider({
  coachMarksEnabled,
  matchFlowActive,
  children,
}: TutorialUiState & { children: ReactNode }) {
  return (
    <TutorialUiContext.Provider value={{ coachMarksEnabled, matchFlowActive }}>
      {children}
    </TutorialUiContext.Provider>
  );
}

export function useTutorialUi(): TutorialUiState {
  return useContext(TutorialUiContext);
}
