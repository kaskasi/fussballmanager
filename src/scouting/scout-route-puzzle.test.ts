import { describe, expect, it } from "vitest";
import { layoutForZone } from "./scout-map-layout.ts";
import { scoreScoutRoute } from "./scout-route-puzzle.ts";

describe("scoreScoutRoute", () => {
  it("rewards duplicate-free paths with higher multiplier", () => {
    const layout = layoutForZone("foerde")!;
    const efficient = scoreScoutRoute(["e1", "e2", "e3"], layout.edges);
    const wasteful = scoreScoutRoute(["e1", "e1", "e2"], layout.edges);
    expect(efficient.allEdgesUnique).toBe(true);
    expect(efficient.progressMultiplier).toBeGreaterThan(wasteful.progressMultiplier);
    expect(wasteful.duplicateEdgeCount).toBe(1);
  });
});
