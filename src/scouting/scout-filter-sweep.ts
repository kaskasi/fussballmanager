import type { AbilityEstimate } from "./estimate-model.ts";

/** Same base unit as PRD 04.1 `scout_visit_report` (−8 uncertainty). */
export const FILTER_SWEEP_VISIT_UNITS = 8;

/**
 * One active filter-sweep assignment spends one department week:
 * `capacity × visit_units × accuracy` uncertainty points, split evenly across
 * all pool players matching the filter (anteilig).
 */
export function filterSweepReductionPerPlayer(
  matchCount: number,
  scoutCapacity: number,
  accuracyModifier: number,
): number {
  if (matchCount <= 0 || scoutCapacity <= 0) return 0;
  const total = FILTER_SWEEP_VISIT_UNITS * scoutCapacity * accuracyModifier;
  return total / matchCount;
}

export function applyFilterSweepToEstimate(
  estimate: AbilityEstimate,
  reduction: number,
): AbilityEstimate {
  if (reduction <= 0) return estimate;
  const uncertaintyRange = Math.max(0, estimate.uncertaintyRange - reduction);
  const sampleSize = estimate.sampleSize + (reduction >= 4 ? 1 : 0);
  return {
    ...estimate,
    uncertaintyRange,
    sampleSize,
  };
}
