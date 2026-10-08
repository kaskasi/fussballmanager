import { describe, expect, it } from "vitest";
import {
  act1AssistantTrainingPlan,
  featureCurtainForPhase,
  filterTeamNavScreens,
  isNavScreenVisible,
  resolveTrainingPlanAfterWeek,
} from "./career-presentation.ts";
import { defaultStoryState, fullGameStoryState } from "./story-state.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";

describe("career presentation (PRD 19)", () => {
  it("act1 hides economy nav screens", () => {
    const state = defaultStoryState();
    expect(state.career_phase).toBe("act1_nordstern");
    expect(isNavScreenVisible("scouting", state)).toBe(false);
    expect(isNavScreenVisible("finances", state)).toBe(false);
    expect(isNavScreenVisible("hub", state)).toBe(true);
  });

  it("full game shows all nav screens", () => {
    const state = fullGameStoryState(defaultStoryState());
    expect(isNavScreenVisible("scouting", state)).toBe(true);
    expect(isNavScreenVisible("stadium", state)).toBe(true);
  });

  it("filters team menu for act1", () => {
    const items = [
      { screen: "hub" as const, labelKey: "a" },
      { screen: "scouting" as const, labelKey: "b" },
    ];
    const filtered = filterTeamNavScreens(items, defaultStoryState());
    expect(filtered.map((i) => i.screen)).toEqual(["hub"]);
  });

  it("act1 assistant plan fills all slots without focus", () => {
    const plan = act1AssistantTrainingPlan();
    expect(plan.length).toBe(SLOT_COUNT);
    expect(plan.every((slot) => slot.unitId.length > 0)).toBe(true);
    expect(plan.some((slot) => slot.focus)).toBe(false);
  });

  it("resolveTrainingPlanAfterWeek uses auto plan in act1", () => {
    const plan = resolveTrainingPlanAfterWeek(defaultStoryState());
    expect(plan.length).toBe(SLOT_COUNT);
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
