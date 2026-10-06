import { describe, expect, it } from "vitest";
import { layoutForZone } from "./scout-map-layout.ts";
import { scoreScoutRoute, scoreScoutRouteFromPath } from "./scout-route-puzzle.ts";

describe("scoreScoutRoute", () => {
  it("rewards duplicate-free paths with higher multiplier", () => {
    const layout = layoutForZone("foerde")!;
    const efficient = scoreScoutRoute(["e1", "e2", "e3"], layout.edges);
    const wasteful = scoreScoutRoute(["e1", "e1", "e2"], layout.edges);
    expect(efficient.allEdgesUnique).toBe(true);
    expect(efficient.progressMultiplier).toBeGreaterThan(wasteful.progressMultiplier);
    expect(wasteful.duplicateEdgeCount).toBe(1);
  });

  it("scores duplicate segments on a city path", () => {
    const nodes = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 10, y: 0 },
    ];
    const once = scoreScoutRouteFromPath(["a", "b"], nodes);
    const twice = scoreScoutRouteFromPath(["a", "b", "a", "b"], nodes);
    expect(once.progressMultiplier).toBeGreaterThan(twice.progressMultiplier);
    expect(twice.duplicateEdgeCount).toBe(2);
  });
});
