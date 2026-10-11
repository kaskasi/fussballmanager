import { describe, expect, it } from "vitest";
import {
  act1AssistantTrainingPlan,
  featureCurtainForPhase,
  filterTeamNavScreens,
  isNavScreenVisible,
  resolvePresentationMode,
  resolveTrainingPlanAfterWeek,
} from "./career-presentation.ts";
import {
  defaultStoryState,
  fullGameStoryState,
  storyModeAct1StoryState,
} from "./story-state.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";

describe("career presentation (PRD 19)", () => {
  it("ignores stale saved feature_curtain when resolving nav", () => {
    const state = {
      ...defaultStoryState(),
      feature_curtain: {
        auto_training: true,
        manual_training: false,
        scouting_nav: false,
        transfers_nav: false,
        stadium_nav: false,
        finances_deep_nav: false,
        opponent_scout_module: false,
        tactics_sliders: false,
      },
    };
    expect(isNavScreenVisible("scouting", state)).toBe(true);
  });

  it("act1 keeps full team nav (story arc no longer hides menu screens)", () => {
    const state = storyModeAct1StoryState();
    expect(state.career_phase).toBe("act1_nordstern");
    expect(isNavScreenVisible("scouting", state)).toBe(true);
    expect(isNavScreenVisible("finances", state)).toBe(true);
    expect(isNavScreenVisible("hub", state)).toBe(true);
  });

  it("full game shows all nav screens", () => {
    const state = fullGameStoryState(defaultStoryState());
    expect(isNavScreenVisible("scouting", state)).toBe(true);
    expect(isNavScreenVisible("stadium", state)).toBe(true);
  });

  it("keeps all team menu entries for act1", () => {
    const items = [
      { screen: "hub" as const, labelKey: "a" },
      { screen: "scouting" as const, labelKey: "b" },
    ];
    const filtered = filterTeamNavScreens(items, storyModeAct1StoryState());
    expect(filtered.map((i) => i.screen)).toEqual(["hub", "scouting"]);
  });

  it("act1 assistant plan fills all slots without focus", () => {
    const plan = act1AssistantTrainingPlan();
    expect(plan.length).toBe(SLOT_COUNT);
    expect(plan.every((slot) => slot.unitId.length > 0)).toBe(true);
    expect(plan.some((slot) => slot.focus)).toBe(false);
  });

  it("resolveTrainingPlanAfterWeek clears plan in act1 (manual training)", () => {
    const plan = resolveTrainingPlanAfterWeek(storyModeAct1StoryState());
    expect(plan.every((slot) => slot.unitId === "")).toBe(true);
  });

  it("resolveTrainingPlanAfterWeek clears plan when manual", () => {
    const state = fullGameStoryState(defaultStoryState());
    const plan = resolveTrainingPlanAfterWeek(state);
    expect(plan.every((slot) => slot.unitId === "")).toBe(true);
  });

  it("featureCurtainForPhase act2 matches full until beats land", () => {
    const curtain = featureCurtainForPhase("act2_regional");
    expect(curtain.manual_training).toBe(true);
    expect(curtain.scouting_nav).toBe(true);
  });
});

describe("resolvePresentationMode (PRD 20)", () => {
  it("uses storybook for early career acts in story mode", () => {
    expect(
      resolvePresentationMode({ ...storyModeAct1StoryState(), career_phase: "act2_regional" }),
    ).toBe("storybook");
  });

  it("uses manager_desk for regionalliga and empire", () => {
    expect(resolvePresentationMode(defaultStoryState())).toBe("manager_desk");
    expect(
      resolvePresentationMode({
        ...storyModeAct1StoryState(),
        career_phase: "act3_empire",
      }),
    ).toBe("manager_desk");
  });
});
