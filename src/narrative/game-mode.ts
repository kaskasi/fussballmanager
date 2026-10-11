/** Product game modes — runtime default is Regionalliga Manager (PRD 24). */

export type ProductGameMode = "regionalliga_manager" | "story_mode" | "new_game_plus";

/** Shipped default until a save/slot switcher exists (PRD 24). */
export const DEFAULT_PRODUCT_GAME_MODE: ProductGameMode = "regionalliga_manager";

export interface GameModeState {
  game_mode?: ProductGameMode;
}

export function resolveProductGameMode(state: GameModeState): ProductGameMode {
  return state.game_mode ?? DEFAULT_PRODUCT_GAME_MODE;
}

export function isStoryCareerArcMode(mode: ProductGameMode): boolean {
  return mode === "story_mode";
}

export function isEliteWorldMode(mode: ProductGameMode): boolean {
  return mode === "new_game_plus";
}
