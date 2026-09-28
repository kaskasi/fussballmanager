import { describe, expect, it } from "vitest";
import { keeperShotCoverage } from "./helpers.ts";

describe("keeperShotCoverage", () => {
  const mouth = { x: 100, y: 50 };
  const shooter = { x: 88, y: 48 };

  it("scores high when the keeper is on the shot line at the mouth", () => {
    expect(keeperShotCoverage({ x: 98, y: 50 }, shooter, mouth)).toBeGreaterThan(
      0.7,
    );
  });

  it("scores near zero when a sweeper is stranded upfield", () => {
    expect(
      keeperShotCoverage({ x: 58, y: 52 }, shooter, mouth),
    ).toBeLessThan(0.12);
  });

  it("scores low when the keeper is goal-side but wide of the shot line", () => {
    expect(
      keeperShotCoverage({ x: 94, y: 64 }, shooter, mouth),
    ).toBeLessThan(0.2);
  });
});
