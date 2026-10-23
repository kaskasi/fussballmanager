import { describe, expect, it } from "vitest";
import {
  act1AssistantTrainingPlan,
  curtainLinkTargets,
  tacticsModeForCurtain,
  deriveFeatureCurtain,
  featureCurtainForPhase,
  fullFeatureCurtain,
  filterTeamNavScreens,
  isNavScreenVisible,
  resolveFeatureCurtain,
  resolvePresentationMode,
  resolveTrainingPlanAfterWeek,
} from "./career-presentation.ts";
import {
  defaultStoryState,
  fullGameStoryState,
  grantCurtainUnlock,
  normalizeStoryState,
  storyModeAct1StoryState,
} from "./story-state.ts";
import { SLOT_COUNT, validateWeeklyPlan } from "../development/weekly-plan.ts";
import { isTrainingPlanNeglected } from "../development/training-neglect.ts";
import { planToSessions } from "../development/training-units.ts";

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

  it("act1 hides scouting, transfers, stadium, finances and merch (PRD 19 matrix)", () => {
    const state = storyModeAct1StoryState();
    expect(state.career_phase).toBe("act1_nordstern");
    for (const screen of ["scouting", "transfers", "stadium", "finances", "merchandising"] as const) {
      expect(isNavScreenVisible(screen, state)).toBe(false);
    }
    for (const screen of ["hub", "postfach", "squad", "training", "calendar", "leagues"] as const) {
      expect(isNavScreenVisible(screen, state)).toBe(true);
    }
  });

  it("act1 curtain is assistant training with formation-only tactics", () => {
    const curtain = resolveFeatureCurtain(storyModeAct1StoryState());
    expect(curtain.auto_training).toBe(true);
    expect(curtain.manual_training).toBe(false);
    expect(curtain.tactics_sliders).toBe(false);
    expect(curtain.opponent_scout_module).toBe(false);
  });

  it("regionalliga manager stays full even with an act phase or stray unlocks", () => {
    expect(deriveFeatureCurtain("regionalliga_manager", "act1_nordstern", [])).toEqual(
      fullFeatureCurtain(),
    );
    expect(deriveFeatureCurtain("new_game_plus", "act2_regional", ["stadium"])).toEqual(
      fullFeatureCurtain(),
    );
  });

  it("act2 with only the stadium unlock shows just the stadium", () => {
    const state = grantCurtainUnlock(
      { ...storyModeAct1StoryState(), career_phase: "act2_regional" },
      "stadium",
    );
    expect(isNavScreenVisible("stadium", state)).toBe(true);
    expect(isNavScreenVisible("scouting", state)).toBe(false);
    expect(isNavScreenVisible("transfers", state)).toBe(false);
    expect(state.feature_curtain.stadium_nav).toBe(true);
  });

  it("manual_training unlock turns the assistant plan off", () => {
    const curtain = deriveFeatureCurtain("story_mode", "act2_regional", ["manual_training"]);
    expect(curtain.manual_training).toBe(true);
    expect(curtain.auto_training).toBe(false);
  });

  it("grantCurtainUnlock is idempotent", () => {
    const once = grantCurtainUnlock(storyModeAct1StoryState(), "transfers");
    expect(grantCurtainUnlock(once, "transfers")).toBe(once);
  });

  it("act3 and later are full in story mode", () => {
    expect(deriveFeatureCurtain("story_mode", "act3_empire", [])).toEqual(fullFeatureCurtain());
    expect(deriveFeatureCurtain("story_mode", "act4_complete", [])).toEqual(fullFeatureCurtain());
  });

  it("full game shows all nav screens", () => {
    const state = fullGameStoryState(defaultStoryState());
    expect(isNavScreenVisible("scouting", state)).toBe(true);
    expect(isNavScreenVisible("stadium", state)).toBe(true);
  });

  it("filters curtained team menu entries for act1", () => {
    const items = [
      { screen: "hub" as const, labelKey: "a" },
      { screen: "scouting" as const, labelKey: "b" },
    ];
    const filtered = filterTeamNavScreens(items, storyModeAct1StoryState());
    expect(filtered.map((i) => i.screen)).toEqual(["hub"]);
  });

  it("act1 assistant plan fills all slots and never counts as neglect", () => {
    const plan = act1AssistantTrainingPlan();
    expect(plan.length).toBe(SLOT_COUNT);
    expect(plan.every((slot) => slot.unitId.length > 0)).toBe(true);
    expect(isTrainingPlanNeglected(plan)).toBe(false);
    expect(validateWeeklyPlan(planToSessions(plan)).valid).toBe(true);
  });

  it("resolveTrainingPlanAfterWeek returns the assistant plan in act1", () => {
    const plan = resolveTrainingPlanAfterWeek(storyModeAct1StoryState());
    expect(plan).toEqual(act1AssistantTrainingPlan());
  });

  it("resolveTrainingPlanAfterWeek clears plan when manual", () => {
    const state = fullGameStoryState(defaultStoryState());
    const plan = resolveTrainingPlanAfterWeek(state);
    expect(plan.every((slot) => slot.unitId === "")).toBe(true);
  });

  it("featureCurtainForPhase act2 starts curtained until beats land", () => {
    const curtain = featureCurtainForPhase("act2_regional");
    expect(curtain.manual_training).toBe(false);
    expect(curtain.scouting_nav).toBe(false);
  });
});

describe("normalizeStoryState (ADR 0005)", () => {
  it("keeps story-mode act fields and rebuilds the curtain cache", () => {
    const raw = {
      ...storyModeAct1StoryState(),
      career_phase: "act2_regional" as const,
      curtain_unlocks: ["stadium" as const, "stadium" as const],
      feature_curtain: fullFeatureCurtain(),
    };
    const normalized = normalizeStoryState(raw);
    expect(normalized.career_phase).toBe("act2_regional");
    expect(normalized.curtain_unlocks).toEqual(["stadium"]);
    expect(normalized.feature_curtain.scouting_nav).toBe(false);
    expect(normalized.feature_curtain.stadium_nav).toBe(true);
  });

  it("strips act fields for regionalliga manager", () => {
    const raw = {
      ...defaultStoryState(),
      career_phase: "act1_nordstern" as const,
      curtain_unlocks: ["stadium" as const],
    };
    const normalized = normalizeStoryState(raw);
    expect(normalized.career_phase).toBe("full");
    expect(normalized.curtain_unlocks).toEqual([]);
    expect(normalized.act_transition).toBeNull();
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
    expect(
      resolvePresentationMode({ ...storyModeAct1StoryState(), career_phase: "act4_complete" }),
    ).toBe("manager_desk");
  });
});

describe("curtain UI helpers (PRD 19 no dead ends)", () => {
  it("act1 offers no links to hidden screens and formation-only tactics", () => {
    const curtain = resolveFeatureCurtain(storyModeAct1StoryState());
    expect(curtainLinkTargets(curtain)).toEqual({
      scouting: false,
      transfers: false,
      stadium: false,
      finances: false,
      opponentScout: false,
    });
    expect(tacticsModeForCurtain(curtain)).toBe("formation_only");
  });

  it("regionalliga manager keeps every link and full tactics", () => {
    const curtain = resolveFeatureCurtain(defaultStoryState());
    expect(Object.values(curtainLinkTargets(curtain)).every(Boolean)).toBe(true);
    expect(tacticsModeForCurtain(curtain)).toBe("full");
  });

  it("every screen NEXT can route to stays visible in act1", () => {
    const state = storyModeAct1StoryState();
    for (const screen of ["hub", "postfach", "calendar", "training", "matchday"] as const) {
      expect(isNavScreenVisible(screen, state)).toBe(true);
    }
  });
});
