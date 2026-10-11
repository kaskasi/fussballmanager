import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_GAME_MODE,
  isStoryCareerArcMode,
  resolveProductGameMode,
} from "./game-mode.ts";
import { regionalligaManagerStoryState, storyModeAct1StoryState } from "./story-state.ts";
import { resolvePresentationMode } from "./career-presentation.ts";

describe("product game mode (PRD 24)", () => {
  it("defaults new saves to regionalliga manager", () => {
    expect(DEFAULT_PRODUCT_GAME_MODE).toBe("regionalliga_manager");
    const state = regionalligaManagerStoryState();
    expect(state.game_mode).toBe("regionalliga_manager");
    expect(state.career_phase).toBe("full");
  });

  it("resolveProductGameMode treats missing field as regionalliga", () => {
    expect(resolveProductGameMode({})).toBe("regionalliga_manager");
  });

  it("story mode is the only career-arc product mode", () => {
    expect(isStoryCareerArcMode("story_mode")).toBe(true);
    expect(isStoryCareerArcMode("regionalliga_manager")).toBe(false);
  });

  it("regionalliga uses manager_desk presentation regardless of legacy phase", () => {
    const state = regionalligaManagerStoryState();
    expect(resolvePresentationMode(state)).toBe("manager_desk");
  });

  it("story act1 uses storybook presentation", () => {
    const state = storyModeAct1StoryState();
    expect(resolvePresentationMode(state)).toBe("storybook");
  });
});
