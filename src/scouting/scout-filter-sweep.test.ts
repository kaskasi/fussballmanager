import { describe, expect, it } from "vitest";
import {
  applyFilterSweepToEstimate,
  filterSweepReductionPerPlayer,
} from "./scout-filter-sweep.ts";

describe("filter sweep", () => {
  it("splits weekly visit budget across all matches", () => {
    expect(filterSweepReductionPerPlayer(100, 3, 1)).toBe((8 * 3) / 100);
    expect(filterSweepReductionPerPlayer(0, 3, 1)).toBe(0);
  });

  it("narrows uncertainty without going below zero", () => {
    const next = applyFilterSweepToEstimate(
      { estimatedAbilityMean: 70, uncertaintyRange: 2, sampleSize: 1 },
      5,
    );
    expect(next.uncertaintyRange).toBe(0);
    expect(next.sampleSize).toBe(2);
  });
});
