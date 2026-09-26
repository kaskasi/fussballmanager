import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { generateYouthIntake } from "../youth/intake-generator.ts";
import { confidenceLabel, type AbilityEstimate } from "./estimate-model.ts";

/**
 * Market targets for Screen 3 (PRD 09.2, F4.1).
 * The wireframe counts are an example size. This demo list is smaller
 * but uses the same three headline buckets.
 */

export type ConfidenceBucket = "known" | "unclear" | "unknown";

export interface ScoutedTarget {
  player: Player;
  estimate: AbilityEstimate;
}

export interface MarketFilters {
  query: string;
  position: PositionPrimary | "all";
  confidence: ConfidenceBucket | "all";
}

export function confidenceBucket(range: number): ConfidenceBucket {
  if (range >= 40) return "unknown";
  if (range >= 20) return "unclear";
  return "known";
}

export function headlineCounts(targets: readonly ScoutedTarget[]): {
  known: number;
  unclear: number;
  unknown: number;
} {
  let known = 0;
  let unclear = 0;
  let unknown = 0;
  for (const target of targets) {
    const bucket = confidenceBucket(target.estimate.uncertaintyRange);
    if (bucket === "known") known += 1;
    else if (bucket === "unclear") unclear += 1;
    else unknown += 1;
  }
  return { known, unclear, unknown };
}

export function filterMarket(targets: readonly ScoutedTarget[], filters: MarketFilters): ScoutedTarget[] {
  const query = filters.query.trim().toLowerCase();
  return targets.filter((target) => {
    if (filters.position !== "all" && target.player.position !== filters.position) return false;
    if (
      filters.confidence !== "all" &&
      confidenceBucket(target.estimate.uncertaintyRange) !== filters.confidence
    ) {
      return false;
    }
    if (!query) return true;
    return (
      formatPlayerName(target.player).toLowerCase().includes(query) ||
      target.player.position.toLowerCase().includes(query) ||
      target.player.birth.region.toLowerCase().includes(query)
    );
  });
}

/** Forty-eight external players with mixed scout knowledge (two intake batches). */
export function loadMarketList(): ScoutedTarget[] {
  const batches = [
    generateYouthIntake({
      season: 1,
      week: 34,
      seasonYear: 2026,
      clubId: "cl_rival_pool",
      nationality: "DE",
      region: "Nordrhein",
      facility: "academy_basic",
      idStart: 101,
      random: mulberry32(404),
    }),
    generateYouthIntake({
      season: 1,
      week: 34,
      seasonYear: 2026,
      clubId: "cl_rival_pool",
      nationality: "DE",
      region: "Bayern",
      facility: "academy_basic",
      idStart: 125,
      random: mulberry32(505),
    }),
  ];
  return batches.flat().map((player, index) => ({
    player: { ...player, club_id: "cl_rival_pool", squad_status: "pro", contract: null },
    estimate: estimateForSlot(index),
  }));
}

function estimateForSlot(index: number): AbilityEstimate {
  const band = index % 10;
  if (band < 4) return { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 };
  if (band < 7) return { estimatedAbilityMean: 72, uncertaintyRange: 28, sampleSize: 1 };
  if (band < 9) return { estimatedAbilityMean: 78, uncertaintyRange: 14, sampleSize: 2 };
  return { estimatedAbilityMean: 84, uncertaintyRange: 6, sampleSize: 4 };
}

export function targetLabel(target: ScoutedTarget): string {
  return confidenceLabel({ status: "scouted", estimate: target.estimate }) ?? "❓";
}

export function barBand(estimate: AbilityEstimate): { value: number; low: number; high: number } {
  const half = estimate.uncertaintyRange / 2;
  return {
    value: estimate.estimatedAbilityMean,
    low: Math.max(0, estimate.estimatedAbilityMean - half),
    high: Math.min(199, estimate.estimatedAbilityMean + half),
  };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
