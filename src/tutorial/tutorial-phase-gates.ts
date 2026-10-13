import type { GameSession } from "../persistence/game-session.ts";
import {
  isNavScreenVisible,
  resolveFeatureCurtain,
  type CurtainNavScreen,
} from "../narrative/career-presentation.ts";
import type { StoryState } from "../narrative/story-state.ts";
import type { TutorialScreenId } from "./tutorial-types.ts";
import { isStepCompleted } from "./tutorial-progress.ts";

/** PRD 25 — Phase 2 may run after desk track or from calendar week 2. */
export const PHASE2_MIN_WEEK = 2;

export function phase1DeskTrackComplete(story: StoryState): boolean {
  return isStepCompleted(story, "hub.top_development");
}

export function phase2Eligible(session: GameSession): boolean {
  return phase1DeskTrackComplete(session.storyState) || session.week >= PHASE2_MIN_WEEK;
}

export function phase3ScoutingEligible(session: GameSession): boolean {
  if (!phase2Eligible(session)) return false;
  return resolveFeatureCurtain(session.storyState).scouting_nav;
}

export function campusTutorialEligible(session: GameSession): boolean {
  if (!phase2Eligible(session)) return false;
  return session.youthInbox.lastReport != null;
}

const PHASE4_CURTAIN_SCREENS = new Set<CurtainNavScreen>([
  "finances",
  "stadium",
  "merchandising",
  "transfers",
  "medical",
  "leagues",
  "calendar",
]);

export function phase4ScreenEligible(session: GameSession, screen: TutorialScreenId): boolean {
  if (!phase2Eligible(session)) return false;
  if (screen === "settings" || screen === "help") return true;
  if (!PHASE4_CURTAIN_SCREENS.has(screen as CurtainNavScreen)) return false;
  return isNavScreenVisible(screen as CurtainNavScreen, session.storyState);
}
