import type { GameSession } from "../persistence/game-session.ts";
import type { CoachTargetId } from "./tutorial-targets.ts";

/** Matches shell `Screen` ids used in routing. */
export type TutorialScreenId =
  | "hub"
  | "training"
  | "campus"
  | "matchday"
  | "scouting"
  | "transfers"
  | "squad"
  | "medical"
  | "finances"
  | "merchandising"
  | "stadium"
  | "leagues"
  | "help"
  | "club-events"
  | "calendar"
  | "postfach"
  | "settings";

/** Persisted step ids — extend via PRD 25 catalog. */
export type TutorialStepId = string;

export type TutorialStepMode = "panel" | "spotlight";

export interface TutorialStepDefinition {
  id: TutorialStepId;
  /** Primary screen; also match `alsoOnScreens` in resolver. */
  screen: TutorialScreenId;
  alsoOnScreens?: readonly TutorialScreenId[];
  mode: TutorialStepMode;
  titleKey: string;
  /** i18n key; use tutorial-copy for dynamic body keys */
  bodyKey: string;
  target?: CoachTargetId;
  targetByScreen?: Partial<Record<TutorialScreenId, CoachTargetId>>;
  /** Spotlight: complete when user clicks the target (also allows Got it). */
  completeOnTargetClick?: boolean;
  when?: (session: GameSession) => boolean;
}

export interface ResolvedTutorialStep {
  definition: TutorialStepDefinition;
  bodyKey: string;
  bodyParams: Record<string, string | number>;
}
