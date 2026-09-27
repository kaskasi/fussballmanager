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

/** Signed net change across skill attributes — used for the pipeline heatmap. */
export function netWeeklyAttributeGrowth(before: Attributes, after: Attributes): number {
  let total = 0;
  for (const key of SKILL_KEYS) {
    total += after[key] - before[key];
  }
  return total;
}

/** Last simulated week's net attribute growth; null before the first week ends. */
export function weeklyGrowthDelta(player: Player): number | null {
  const value = player.state.last_week_growth;
  return value === undefined ? null : value;
}

export function formatGrowthDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (delta > 0) return `+${delta.toFixed(1)}`;
  if (delta < 0) return delta.toFixed(1);
  return "0";
}

export function stampWeeklyGrowthTracking(before: Player, after: Player): Player {
  const positive = weeklyAttributeGrowth(before.attributes, after.attributes);
  const net = netWeeklyAttributeGrowth(before.attributes, after.attributes);
  const withRolling = accumulateWeeklyGrowth(after, positive);
  return {
    ...withRolling,
    state: {
      ...withRolling.state,
      last_week_growth: net,
    },
  };
}

export function stampWeeklyGrowthBatch(
  before: readonly Player[],
  after: readonly Player[],
): Player[] {
  const beforeById = new Map(before.map((player) => [player.id, player]));
  return after.map((player) => {
    const prior = beforeById.get(player.id);
    if (!prior) return player;
    return stampWeeklyGrowthTracking(prior, player);
  });
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
