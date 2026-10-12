import { describe, expect, it } from "vitest";
import { fitPrecinctTilePx } from "./use-precinct-mobile-tile-size.ts";

describe("fitPrecinctTilePx", () => {
  it("fits columns into host width minus gaps", () => {
    const px = fitPrecinctTilePx({ hostWidthPx: 360, columns: 18, rootFontPx: 16 });
    expect(px).toBeGreaterThan(13);
    expect(px).toBeLessThanOrEqual(1.85 * 16);
  });

  it("clamps to minimum tile size on tiny hosts", () => {
    const px = fitPrecinctTilePx({ hostWidthPx: 120, columns: 18, rootFontPx: 16 });
    expect(px).toBe(0.82 * 16);
  });
});
