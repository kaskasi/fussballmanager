import { describe, expect, it } from "vitest";
import { layoutForZone } from "./scout-map-layout.ts";
import { pickClubLogoPinLayout } from "./scout-map-pin-layout.ts";
import type { ScoutMapNode } from "./scout-map-layout.ts";

describe("pickClubLogoPinLayout", () => {
  it("keeps pin on city coordinates and offsets logo from pin", () => {
    const layout = layoutForZone("foerde");
    expect(layout).toBeTruthy();
    const nodes: ScoutMapNode[] = layout!.anchorNodes.map((anchor) => ({
      ...anchor,
      discovered: true,
      scoutable: true,
    }));
    const node = nodes[0]!;
    const placement = pickClubLogoPinLayout(node, nodes, layout!.edges, 18);
    expect(placement.pinX).toBe(node.x);
    expect(placement.pinY).toBe(node.y);
    expect(Math.hypot(placement.logoX + 9 - node.x, placement.logoY + 9 - node.y)).toBeGreaterThan(8);
  });
});
