import type { Attributes, Player } from "../types/player.ts";

const GROWTH_WINDOW_WEEKS = 26;

const SKILL_KEYS = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "weak_foot",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

export function weeklyAttributeGrowth(before: Attributes, after: Attributes): number {
  let total = 0;
  for (const key of SKILL_KEYS) {
    total += Math.max(0, after[key] - before[key]);
  }
  return total;
}

export function accumulateWeeklyGrowth(player: Player, growthDelta: number): Player {
  const prior = player.state.recent_growth_26w ?? 0;
  const decayed = prior * ((GROWTH_WINDOW_WEEKS - 1) / GROWTH_WINDOW_WEEKS);
  return {
    ...player,
    state: {
      ...player.state,
      recent_growth_26w: decayed + growthDelta,
    },
  };
}
