/** Career act presentation layer (PRD 19) — curtain + auto training, not sim changes. */

import {
  resolveProductGameMode,
  type GameModeState,
  type ProductGameMode,
} from "./game-mode.ts";
import { emptyWeeklyTrainingPlan } from "../development/training-plan-state.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";

export type CareerPhase =
  | "act1_nordstern"
  | "act2_regional"
  | "act3_empire"
  | "act4_complete"
  | "elite_world"
  | "full";

/** Story Mode Act 2 unlocks (PRD 19, ADR 0005) — append-only per save. */
export type CurtainUnlockId =
  | "tactics_sliders"
  | "stadium"
  | "finances_deep"
  | "scouting_regions"
  | "manual_training"
  | "opponent_scout"
  | "transfers";

export type PresentationMode = "storybook" | "manager_desk";

/** PRD 20 / PRD 24 — CSS `data-presentation` (curtain unchanged). */
export function resolvePresentationMode(
  state: CareerPresentationState,
): PresentationMode {
  const mode = resolveProductGameMode(state);
  if (mode === "regionalliga_manager" || mode === "new_game_plus") {
    return "manager_desk";
  }
  if (state.career_phase === "act1_nordstern" || state.career_phase === "act2_regional") {
    return "storybook";
  }
  return "manager_desk";
}

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

export interface CareerPresentationState extends GameModeState {
  career_phase: CareerPhase;
  curtain_unlocks?: readonly CurtainUnlockId[];
  /** Denormalized cache for saves/debugging — never read for decisions (ADR 0005). */
  feature_curtain?: FeatureCurtain;
}

export type CurtainNavScreen =
  | "hub"
  | "postfach"
  | "squad"
  | "training"
  | "medical"
  | "campus"
  | "scouting"
  | "transfers"
  | "calendar"
  | "leagues"
  | "finances"
  | "merchandising"
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

/** PRD 19 Act 1 matrix — assistant training, formation-only tactics, commerce/scouting hidden. */
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

function applyUnlock(curtain: FeatureCurtain, unlock: CurtainUnlockId): FeatureCurtain {
  switch (unlock) {
    case "tactics_sliders":
      return { ...curtain, tactics_sliders: true };
    case "stadium":
      return { ...curtain, stadium_nav: true };
    case "finances_deep":
      return { ...curtain, finances_deep_nav: true };
    case "scouting_regions":
      return { ...curtain, scouting_nav: true };
    case "manual_training":
      return { ...curtain, auto_training: false, manual_training: true };
    case "opponent_scout":
      return { ...curtain, opponent_scout_module: true };
    case "transfers":
      return { ...curtain, transfers_nav: true };
  }
}

/** ADR 0005 — the curtain is derived from mode, phase and unlocks, never trusted from the save. */
export function deriveFeatureCurtain(
  mode: ProductGameMode,
  phase: CareerPhase,
  unlocks: readonly CurtainUnlockId[] = [],
): FeatureCurtain {
  if (mode !== "story_mode") return fullFeatureCurtain();
  if (phase === "act1_nordstern" || phase === "act2_regional") {
    return unlocks.reduce(applyUnlock, act1FeatureCurtain());
  }
  return fullFeatureCurtain();
}

/** Story Mode curtain for a phase with no unlocks yet (migrations, defaults). */
export function featureCurtainForPhase(phase: CareerPhase): FeatureCurtain {
  return deriveFeatureCurtain("story_mode", phase);
}

export function resolveFeatureCurtain(state: CareerPresentationState): FeatureCurtain {
  return deriveFeatureCurtain(
    resolveProductGameMode(state),
    state.career_phase,
    state.curtain_unlocks ?? [],
  );
}

const ACT1_UNIT_ROTATION = [
  "tech_pass",
  "phys_speed",
  "ment_tactical",
  "tech_ball",
  "phys_power",
] as const;

/** Two focus slots — a plan without focus counts as training neglect (morale, board, fans). */
const ACT1_FOCUS_SLOTS = new Set([0, 8]);

/** Assistant-run week plan for Act 1 — all slots filled, two focus marks. */
export function act1AssistantTrainingPlan(): TrainingSlot[] {
  const plan = emptyWeeklyTrainingPlan();
  for (let i = 0; i < SLOT_COUNT; i++) {
    const unitId = ACT1_UNIT_ROTATION[i % ACT1_UNIT_ROTATION.length]!;
    plan[i] = { unitId, focus: ACT1_FOCUS_SLOTS.has(i) };
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
    case "merchandising":
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

/** Which cross-screen links a surface may render — a hidden screen gets no button (PRD 19 no dead ends). */
export interface CurtainLinkTargets {
  scouting: boolean;
  transfers: boolean;
  stadium: boolean;
  finances: boolean;
  opponentScout: boolean;
}

export function curtainLinkTargets(curtain: FeatureCurtain): CurtainLinkTargets {
  return {
    scouting: curtain.scouting_nav,
    transfers: curtain.transfers_nav,
    stadium: curtain.stadium_nav,
    finances: curtain.finances_deep_nav,
    opponentScout: curtain.opponent_scout_module,
  };
}

export type TacticsMode = "formation_only" | "full";

/** PRD 19 Act 1 — formation picker only, presets and sliders arrive with the Act 2 beat. */
export function tacticsModeForCurtain(curtain: FeatureCurtain): TacticsMode {
  return curtain.tactics_sliders ? "full" : "formation_only";
}
