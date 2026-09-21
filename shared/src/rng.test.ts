import { describe, expect, it } from "vitest";
import { createRng, nextInt, nextUnit } from "./rng.ts";

describe("seeded rng", () => {
  it("replays the same stream for the same seed", () => {
    const a = draw(createRng(42), 8);
    const b = draw(createRng(42), 8);
    expect(a).toEqual(b);
  });

  it("diverges for a different seed", () => {
    const a = draw(createRng(42), 8);
    const b = draw(createRng(43), 8);
    expect(a).not.toEqual(b);
  });
});

function draw(start: ReturnType<typeof createRng>, count: number): number[] {
  let rng = start;
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const unit = nextUnit(rng);
    const int = nextInt(unit.rng, 10);
    rng = int.rng;
    values.push(unit.n, int.i);
  }
  return values;
}
