import { describe, expect, it } from "vitest";
import {
  blockCapacityAtExpansionLevel,
  blockExpansionBuildWeeks,
  blockExpansionWeeksRemaining,
  startBlockExpansion,
  advanceBlockExpansionProjects,
  BLOCK_EXPANSION_MAX_LEVEL,
} from "./stadium-block-expansion.ts";
import { defaultClubStadium } from "./club-stadium.ts";

describe("stadium block expansion", () => {
  it("ramps Nordkurve toward 25k at level 10", () => {
    expect(blockCapacityAtExpansionLevel("north", 1)).toBe(2_400);
    expect(blockCapacityAtExpansionLevel("north", BLOCK_EXPANSION_MAX_LEVEL)).toBe(25_000);
  });

  it("longer builds at higher levels", () => {
    expect(blockExpansionBuildWeeks(2)).toBeGreaterThanOrEqual(3);
    expect(blockExpansionBuildWeeks(10)).toBeLessThanOrEqual(12);
    expect(blockExpansionBuildWeeks(10)).toBeGreaterThan(blockExpansionBuildWeeks(2));
  });

  it("reports weeks remaining while building", () => {
    let stadium = startBlockExpansion(defaultClubStadium(), "north", 1, 1);
    expect(blockExpansionWeeksRemaining(stadium, "north", 1, 1)).toBeGreaterThan(0);
  });

  it("completes construction after the scheduled week", () => {
    let stadium = defaultClubStadium();
    stadium = startBlockExpansion(stadium, "north", 1, 1);
    expect(stadium.block_expansion?.north?.construction_until).toBeDefined();
    const finished = advanceBlockExpansionProjects(stadium, 1, 20);
    stadium = finished.stadium;
    expect(finished.completions).toHaveLength(1);
    expect(finished.completions[0]?.capacity).toBe(blockCapacityAtExpansionLevel("north", 2));
    expect(stadium.block_expansion?.north?.level).toBe(2);
    expect(stadium.block_expansion?.north?.construction_until).toBeUndefined();
  });
});
