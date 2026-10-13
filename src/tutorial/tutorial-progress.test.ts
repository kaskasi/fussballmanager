import { describe, expect, it } from "vitest";
import { defaultStoryState } from "../narrative/story-state.ts";
import {
  dismissTutorialScreen,
  isStepCompleted,
  markStepCompleted as markTutorialStep,
  resetTutorialProgress,
  tutorialsAllowedForScreen,
} from "./tutorial-progress.ts";
import { resolveActiveTutorialStep } from "./tutorial-resolver.ts";
import type { GameSession } from "../persistence/game-session.ts";

function minimalSession(story = defaultStoryState()): GameSession {
  return {
    storyState: { ...story, opening_complete: true },
  } as GameSession;
}

describe("tutorial-progress", () => {
  it("marks steps completed", () => {
    let story = defaultStoryState();
    expect(isStepCompleted(story, "hub.intro_origin")).toBe(false);
    story = markTutorialStep(story, "hub.intro_origin");
    expect(isStepCompleted(story, "hub.intro_origin")).toBe(true);
  });

  it("dismisses screen", () => {
    let story = defaultStoryState();
    story = dismissTutorialScreen(story, "hub");
    expect(
      tutorialsAllowedForScreen({
        openingComplete: true,
        coachMarksEnabled: true,
        matchFlowActive: false,
        story,
        screen: "hub",
      }),
    ).toBe(false);
  });

  it("reset clears progress", () => {
    let story = markTutorialStep(defaultStoryState(), "hub.click_next");
    story = dismissTutorialScreen(story, "hub");
    story = resetTutorialProgress(story);
    expect(isStepCompleted(story, "hub.click_next")).toBe(false);
    expect(
      tutorialsAllowedForScreen({
        openingComplete: true,
        coachMarksEnabled: true,
        matchFlowActive: false,
        story,
        screen: "hub",
      }),
    ).toBe(true);
  });
});

describe("tutorial-resolver", () => {
  it("returns intro step on fresh save", () => {
    const session = minimalSession();
    const step = resolveActiveTutorialStep(session, "hub", true, false);
    expect(step?.definition.id).toBe("hub.intro_origin");
  });

  it("returns click_next after intro complete", () => {
    let story = markTutorialStep(defaultStoryState(), "hub.intro_origin");
    story = { ...story, opening_complete: true };
    const session = minimalSession(story);
    const step = resolveActiveTutorialStep(session, "hub", true, false);
    expect(step?.definition.id).toBe("hub.click_next");
  });

  it("returns open_training after hub next step", () => {
    let story = defaultStoryState();
    story = markTutorialStep(story, "hub.intro_origin");
    story = markTutorialStep(story, "hub.click_next");
    story = { ...story, opening_complete: true };
    const session = minimalSession(story);
    const step = resolveActiveTutorialStep(session, "hub", true, false);
    expect(step?.definition.id).toBe("hub.open_training");
  });
});
