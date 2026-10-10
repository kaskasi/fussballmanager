import { describe, expect, it } from "vitest";
import { injuryNeedsSurgery } from "./injury-care.ts";

describe("injuryNeedsSurgery", () => {
  const seed = 42_424;

  it("never requires surgery for minor injuries", () => {
    for (const typeId of ["knee", "ankle", "groin", "back", "muscle"]) {
      expect(injuryNeedsSurgery("minor", typeId, "p1", seed)).toBe(false);
    }
  });

  it("always requires surgery for severe knee/ankle/groin/back", () => {
    expect(injuryNeedsSurgery("severe", "knee", "p1", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "ankle", "p2", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "groin", "p3", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "back", "p4", seed)).toBe(true);
  });

  it("is deterministic per player and type", () => {
    const a = injuryNeedsSurgery("moderate", "knee", "player-a", seed);
    const b = injuryNeedsSurgery("moderate", "knee", "player-a", seed);
    const c = injuryNeedsSurgery("moderate", "knee", "player-b", seed);
    expect(a).toBe(b);
    expect(typeof a).toBe("boolean");
    expect(typeof c).toBe("boolean");
  });

  it("moderate muscle rarely needs surgery vs moderate knee", () => {
    let kneeOps = 0;
    let muscleOps = 0;
    for (let i = 0; i < 200; i++) {
      const id = `probe-${i}`;
      if (injuryNeedsSurgery("moderate", "knee", id, seed)) kneeOps += 1;
      if (injuryNeedsSurgery("moderate", "muscle", id, seed)) muscleOps += 1;
    }
    expect(kneeOps).toBeGreaterThan(muscleOps);
  });
});
