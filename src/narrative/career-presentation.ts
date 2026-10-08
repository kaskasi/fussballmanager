/** Career act presentation layer (PRD 19) — curtain + auto training, not sim changes. */

import { emptyWeeklyTrainingPlan } from "../development/training-plan-state.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";

export type CareerPhase =
  | "act1_nordstern"
  | "act2_regional"
  | "act3_empire"
  | "full";

export interface FeatureCurtain {
  auto_training: boolean;
  manual_training: boolean;
  scouting_nav: boolean;
  transfers_nav: boolean;
  stadium_nav: boolean;
  finances_deep_nav: boolean;
  opponent_scout_module: boolean;
  tactics_sliders: boolean;
}

export interface CareerPresentationState {
  career_phase: CareerPhase;
  feature_curtain?: FeatureCurtain;
}

export type CurtainNavScreen =
  | "hub"
  | "postfach"
  | "squad"
  | "training"
  | "campus"
  | "scouting"
  | "transfers"
  | "calendar"
  | "leagues"
  | "finances"
  | "stadium"
  | "help"
  | "matchday";

export function fullFeatureCurtain(): FeatureCurtain {
  return {
    auto_training: false,
    manual_training: true,
    scouting_nav: true,
    transfers_nav: true,
    stadium_nav: true,
    finances_deep_nav: true,
    opponent_scout_module: true,
    tactics_sliders: true,
  };
}

export function act1FeatureCurtain(): FeatureCurtain {
  return {
    auto_training: true,
    manual_training: false,
    scouting_nav: false,
    transfers_nav: false,
    stadium_nav: false,
    finances_deep_nav: false,
    opponent_scout_module: false,
    tactics_sliders: false,
  };
}

export function featureCurtainForPhase(phase: CareerPhase): FeatureCurtain {
  if (phase === "act1_nordstern") return act1FeatureCurtain();
  return fullFeatureCurtain();
}

export function resolveFeatureCurtain(state: CareerPresentationState): FeatureCurtain {
  return state.feature_curtain ?? featureCurtainForPhase(state.career_phase);
}

const ACT1_UNIT_ROTATION = [
  "tech_pass",
  "phys_speed",
  "ment_tactical",
  "tech_ball",
  "phys_power",
] as const;

/** Assistant-run week plan for Act 1 — all slots filled, no focus marks. */
export function act1AssistantTrainingPlan(): TrainingSlot[] {
  const plan = emptyWeeklyTrainingPlan();
  for (let i = 0; i < SLOT_COUNT; i++) {
    const unitId = ACT1_UNIT_ROTATION[i % ACT1_UNIT_ROTATION.length]!;
    plan[i] = { unitId, focus: false };
  }
  return plan;
}

export function resolveTrainingPlanAfterWeek(storyState: CareerPresentationState): TrainingSlot[] {
  const curtain = resolveFeatureCurtain(storyState);
  if (curtain.auto_training) return act1AssistantTrainingPlan();
  return emptyWeeklyTrainingPlan();
}

export function suppressTrainingPlanWarning(storyState: CareerPresentationState): boolean {
  return resolveFeatureCurtain(storyState).auto_training;
}

function navFlagForScreen(screen: CurtainNavScreen, curtain: FeatureCurtain): boolean {
  switch (screen) {
    case "scouting":
      return curtain.scouting_nav;
    case "transfers":
      return curtain.transfers_nav;
    case "stadium":
      return curtain.stadium_nav;
    case "finances":
      return curtain.finances_deep_nav;
    default:
      return true;
  }
}

export function isNavScreenVisible(
  screen: CurtainNavScreen,
  storyState: CareerPresentationState,
): boolean {
  const curtain = resolveFeatureCurtain(storyState);
  return navFlagForScreen(screen, curtain);
}

export function filterTeamNavScreens<T extends { screen: CurtainNavScreen }>(
  items: readonly T[],
  storyState: CareerPresentationState,
): T[] {
  return items.filter((item) => isNavScreenVisible(item.screen, storyState));
}
