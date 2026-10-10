import { describe, expect, it } from "vitest";
import { generateContractWeights } from "./contract-priorities.ts";

describe("contract-priorities", () => {
  it("generates weights that sum to 1", () => {
    const weights = generateContractWeights("pl_00001", 42);
    const sum =
      weights.money +
      weights.playing_time +
      weights.ambition +
      weights.loyalty +
      weights.location;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("is deterministic for the same seed", () => {
    expect(generateContractWeights("pl_00001", 1)).toEqual(generateContractWeights("pl_00001", 1));
  });
});
