import type { Attributes, Player } from "../types/player.ts";

const GROWTH_WINDOW_WEEKS = 26;

export const WEEKLY_SKILL_KEYS = [
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

const SKILL_KEYS = WEEKLY_SKILL_KEYS;

export function copyAttributes(attrs: Attributes): Attributes {
  return { ...attrs };
}

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

/** Net skill growth since the current calendar week started (manual training units). */
export function weeklyGrowthSoFar(
  player: Player,
  season: number,
  week: number,
): number | null {
  const key = player.state.week_start_key;
  const baseline = player.state.week_start_attributes;
  if (!baseline || !key || key.season !== season || key.week !== week) {
    return null;
  }
  return netWeeklyAttributeGrowth(baseline, player.attributes);
}

export function ensureTrainingWeekBaselines(
  players: readonly Player[],
  season: number,
  week: number,
): Player[] {
  return players.map((player) => {
    const key = player.state.week_start_key;
    if (
      key?.season === season &&
      key.week === week &&
      player.state.week_start_attributes
    ) {
      return player;
    }
    return {
      ...player,
      state: {
        ...player.state,
        week_start_attributes: copyAttributes(player.attributes),
        week_start_key: { season, week },
      },
    };
  });
}

export function stampWeekStartAttributesBatch(
  players: readonly Player[],
  season: number,
  week: number,
): Player[] {
  return players.map((player) => ({
    ...player,
    state: {
      ...player.state,
      week_start_attributes: copyAttributes(player.attributes),
      week_start_key: { season, week },
    },
  }));
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
