import type { Attributes, TemporaryModifier } from "../types/player.ts";

export const GROWTH_MULTIPLIER_MIN = 0.4;
export const GROWTH_MULTIPLIER_MAX = 2.5;

const TECHNICAL = new Set<keyof Attributes>([
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "weak_foot",
]);

const PHYSICAL = new Set<keyof Attributes>([
  "pace",
  "strength",
  "stamina",
  "gk_handling",
]);

function modifierActive(mod: TemporaryModifier, week: number, injured: boolean): boolean {
  if (mod.until_injury_end) return injured;
  if (mod.until_week !== undefined) return mod.until_week > week;
  return true;
}

/** PRD 06 Tier-2 — product of active weekly_growth_multiplier modifiers (clamped). */
export function aggregateWeeklyGrowthMultiplier(
  modifiers: readonly TemporaryModifier[],
  week: number,
  injured: boolean,
): number {
  let product = 1;
  for (const mod of modifiers) {
    if (!modifierActive(mod, week, injured)) continue;
    if (mod.weekly_growth_multiplier === undefined) continue;
    product *= mod.weekly_growth_multiplier;
  }
  return Math.min(GROWTH_MULTIPLIER_MAX, Math.max(GROWTH_MULTIPLIER_MIN, product));
}

/** Extra multiplier when modifier targets a technical/physical cluster only. */
export function attributeGroupGrowthBias(
  modifiers: readonly TemporaryModifier[],
  week: number,
  injured: boolean,
  attribute: keyof Attributes,
): number {
  let bias = 1;
  for (const mod of modifiers) {
    if (!modifierActive(mod, week, injured)) continue;
    if (!mod.attribute_group || mod.weekly_growth_multiplier === undefined) continue;
    const inGroup =
      mod.attribute_group === "technical"
        ? TECHNICAL.has(attribute)
        : PHYSICAL.has(attribute);
    if (inGroup) bias *= mod.weekly_growth_multiplier;
  }
  return Math.min(GROWTH_MULTIPLIER_MAX, Math.max(1, bias));
}
