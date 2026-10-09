import { careerWeekIndex } from "./hospitality.ts";
import { STADIUM_BASE_BLOCKS, type ClubStadium, type StadiumBlock } from "./club-stadium.ts";

export const BLOCK_EXPANSION_MAX_LEVEL = 10;

/** Target capacity at max level (Nordkurve example: 25k). */
const BLOCK_EXPANSION_CAP: Record<string, number> = {
  north: 25_000,
  south: 18_000,
  west: 14_000,
  east: 6_000,
  vip: 450,
};

export interface BlockExpansionState {
  level: number;
  /** Career week index (inclusive) when construction ends; absent = idle. */
  construction_until?: number;
}

export function blockExpansionState(
  stadium: ClubStadium,
  blockId: string,
): BlockExpansionState {
  return stadium.block_expansion?.[blockId] ?? { level: 1 };
}

export function blockExpansionLevel(stadium: ClubStadium, blockId: string): number {
  return blockExpansionState(stadium, blockId).level;
}

function baseBlockCapacity(blockId: string): number {
  return STADIUM_BASE_BLOCKS.find((entry) => entry.id === blockId)?.capacity ?? 1_000;
}

export function blockCapacityAtExpansionLevel(blockId: string, level: number): number {
  const base = baseBlockCapacity(blockId);
  const max = BLOCK_EXPANSION_CAP[blockId] ?? Math.round(base * 2.5);
  if (level <= 1) return base;
  const t = (level - 1) / (BLOCK_EXPANSION_MAX_LEVEL - 1);
  return Math.round(base + (max - base) * t);
}

/** Weeks offline for tribune revenue — higher target level, longer build. */
export function blockExpansionBuildWeeks(nextLevel: number): number {
  if (nextLevel <= 1) return 0;
  const t = (nextLevel - 2) / (BLOCK_EXPANSION_MAX_LEVEL - 2);
  return Math.round(3 + t * (12 - 3));
}

export function blockExpansionCost(blockId: string, nextLevel: number): number {
  const base = blockId === "vip" ? 420_000 : 280_000;
  return Math.round(base * (0.65 + nextLevel * 0.38));
}

export function isBlockUnderConstruction(
  stadium: ClubStadium,
  blockId: string,
  season: number,
  week: number,
): boolean {
  const state = blockExpansionState(stadium, blockId);
  if (state.construction_until == null) return false;
  return careerWeekIndex(season, week) <= state.construction_until;
}

/** Inclusive weeks left while tribune ticket income is offline. */
export function blockExpansionWeeksRemaining(
  stadium: ClubStadium,
  blockId: string,
  season: number,
  week: number,
): number {
  if (!isBlockUnderConstruction(stadium, blockId, season, week)) return 0;
  const until = blockExpansionState(stadium, blockId).construction_until;
  if (until == null) return 0;
  return until - careerWeekIndex(season, week) + 1;
}

export function applyBlockExpansionCapacities(
  stadium: ClubStadium,
  blocks: StadiumBlock[],
): StadiumBlock[] {
  return blocks.map((block) => {
    const level = blockExpansionLevel(stadium, block.id);
    if (level <= 1 && !stadium.block_expansion?.[block.id]) return block;
    return {
      ...block,
      capacity: blockCapacityAtExpansionLevel(block.id, level),
    };
  });
}

export function advanceBlockExpansionProjects(
  stadium: ClubStadium,
  season: number,
  week: number,
): ClubStadium {
  const expansion = stadium.block_expansion;
  if (!expansion) return stadium;
  let changed = false;
  const next: Record<string, BlockExpansionState> = { ...expansion };
  const now = careerWeekIndex(season, week);
  for (const [blockId, state] of Object.entries(expansion)) {
    if (state.construction_until == null) continue;
    if (now < state.construction_until) continue;
    changed = true;
    next[blockId] = {
      level: Math.min(BLOCK_EXPANSION_MAX_LEVEL, state.level + 1),
    };
  }
  if (!changed) return stadium;
  return { ...stadium, block_expansion: next };
}

export function canStartBlockExpansion(
  stadium: ClubStadium,
  blockId: string,
  season: number,
  week: number,
  cash: number,
): { allowed: boolean; reason?: string; cost?: number; weeks?: number; nextLevel?: number } {
  const state = blockExpansionState(stadium, blockId);
  if (state.construction_until != null && isBlockUnderConstruction(stadium, blockId, season, week)) {
    return { allowed: false, reason: "Tribüne im Bau." };
  }
  const level = state.level;
  if (level >= BLOCK_EXPANSION_MAX_LEVEL) {
    return { allowed: false, reason: "Maximalstufe." };
  }
  const nextLevel = level + 1;
  const cost = blockExpansionCost(blockId, nextLevel);
  if (cash < cost) return { allowed: false, reason: "Nicht genug Cash.", cost, nextLevel };
  return {
    allowed: true,
    cost,
    weeks: blockExpansionBuildWeeks(nextLevel),
    nextLevel,
  };
}

export function startBlockExpansion(
  stadium: ClubStadium,
  blockId: string,
  season: number,
  week: number,
): ClubStadium {
  const check = canStartBlockExpansion(stadium, blockId, season, week, Number.POSITIVE_INFINITY);
  if (!check.allowed || !check.weeks || !check.nextLevel) return stadium;
  const state = blockExpansionState(stadium, blockId);
  const until = careerWeekIndex(season, week) + check.weeks - 1;
  return {
    ...stadium,
    block_expansion: {
      ...(stadium.block_expansion ?? {}),
      [blockId]: {
        level: state.level,
        construction_until: until,
      },
    },
  };
}
