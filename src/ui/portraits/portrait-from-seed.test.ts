import { describe, expect, it } from "vitest";
import {
  bustIdFromPortraitSeed,
  PORTRAIT_BUST_COUNT,
  portraitBustUrl,
  portraitUrlFromSeed,
} from "./portrait-from-seed.ts";
import { portraitPoolIds } from "./portrait-pools.ts";

const mensIds = portraitPoolIds("mens_squad");
const mixedIds = portraitPoolIds("mixed");

describe("bustIdFromPortraitSeed", () => {
  it("maps seed 42 to a stable bust id in mens_squad pool", () => {
    expect(bustIdFromPortraitSeed(42)).toBe(mensIds[42 % mensIds.length]);
  });

  it("coerces negative seeds via unsigned conversion", () => {
    const id = bustIdFromPortraitSeed(-1);
    expect(id).toBe(mensIds[(-1 >>> 0) % mensIds.length]);
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(PORTRAIT_BUST_COUNT);
  });

  it("maps 0 to first mens_squad bust", () => {
    expect(bustIdFromPortraitSeed(0)).toBe(mensIds[0]);
  });

  it("uses full catalog for mixed pool", () => {
    expect(bustIdFromPortraitSeed(42, "mixed")).toBe(mixedIds[42 % mixedIds.length]);
  });

  it("never picks non-mens pitch busts (dress, killer, hijab heads, …)", () => {
    const forbidden = new Set([1, 16, 56, 70, 87, 89]); // dress + killer examples
    for (let seed = 0; seed < 2000; seed++) {
      const id = bustIdFromPortraitSeed(seed);
      expect(forbidden.has(id)).toBe(false);
      expect(mensIds).toContain(id);
    }
  });
});

describe("portraitBustUrl", () => {
  it("returns public path for bust 1 (charge1 or charge2 file)", () => {
    expect(portraitBustUrl(1)).toMatch(/^\/assets\/portraits\/bust\/(peep-1\.svg|charge2\/peep-1\.svg)$/);
  });

  it("clamps out-of-range ids", () => {
    expect(portraitBustUrl(999)).toBe(portraitBustUrl(PORTRAIT_BUST_COUNT));
    expect(portraitBustUrl(0)).toBe(portraitBustUrl(1));
  });
});

describe("portraitUrlFromSeed", () => {
  it("combines seed mapping and url", () => {
    const id = bustIdFromPortraitSeed(42);
    expect(portraitUrlFromSeed(42)).toBe(portraitBustUrl(id));
  });
});
