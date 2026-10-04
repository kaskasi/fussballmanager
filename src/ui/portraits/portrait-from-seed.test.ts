import { describe, expect, it } from "vitest";
import {
  bustIdFromPortraitSeed,
  PORTRAIT_BUST_COUNT,
  portraitBustUrl,
  portraitUrlFromSeed,
} from "./portrait-from-seed.ts";

describe("bustIdFromPortraitSeed", () => {
  it("maps seed 42 to a stable bust id", () => {
    expect(bustIdFromPortraitSeed(42)).toBe(43);
  });

  it("coerces negative seeds via unsigned conversion", () => {
    expect(bustIdFromPortraitSeed(-1)).toBe(46);
    expect(bustIdFromPortraitSeed(-1)).toBeGreaterThanOrEqual(1);
    expect(bustIdFromPortraitSeed(-1)).toBeLessThanOrEqual(PORTRAIT_BUST_COUNT);
  });

  it("maps 0 to bust 1", () => {
    expect(bustIdFromPortraitSeed(0)).toBe(1);
  });

  it("maps 104 to bust 105", () => {
    expect(bustIdFromPortraitSeed(104)).toBe(105);
  });

  it("wraps at bust count", () => {
    expect(bustIdFromPortraitSeed(105)).toBe(1);
  });
});

describe("portraitBustUrl", () => {
  it("returns public path for bust 1", () => {
    expect(portraitBustUrl(1)).toBe("/assets/portraits/bust/peep-1.svg");
  });

  it("clamps out-of-range ids", () => {
    expect(portraitBustUrl(999)).toBe("/assets/portraits/bust/peep-105.svg");
    expect(portraitBustUrl(0)).toBe("/assets/portraits/bust/peep-1.svg");
  });
});

describe("portraitUrlFromSeed", () => {
  it("combines seed mapping and url", () => {
    expect(portraitUrlFromSeed(42)).toBe("/assets/portraits/bust/peep-43.svg");
  });
});
