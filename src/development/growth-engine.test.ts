import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyGrowth,
  attributeSigma,
  calculateWeeklyGrowth,
  decayPerWeek,
  sampleNoise,
  type WeeklyGrowthInput,
} from "./growth-engine.ts";

const quiet = {
  maturityOffset: 0,
  focusSlots: 0 as const,
  injured: false,
  noise: 1,
};

function growth(overrides: Partial<WeeklyGrowthInput> & Pick<WeeklyGrowthInput, "age" | "attribute" | "value" | "anlage" | "drive" | "minutes">): number {
  return calculateWeeklyGrowth({ ...quiet, ...overrides });
}

describe("PRD 02.7 growth invariants", () => {
  it("applies coaching environment factor to growth", () => {
    const baseline = growth({
      age: 19,
      attribute: "passing",
      value: 100,
      anlage: 1.2,
      drive: 1.4,
      minutes: 90,
      environmentFactor: 1,
    });
    const boosted = growth({
      age: 19,
      attribute: "passing",
      value: 100,
      anlage: 1.2,
      drive: 1.4,
      minutes: 90,
      environmentFactor: 1.08,
    });
    expect(boosted).toBeCloseTo(baseline * 1.08, 4);
  });

  it("age 19, 90 minutes, grows faster in the 15–20 window", () => {
    const delta = growth({
      age: 19,
      attribute: "passing",
      value: 100,
      anlage: 1.2,
      drive: 1.4,
      minutes: 90,
    });
    expect(delta).toBeCloseTo(0.07 * 2.4 * 1.2 * 1.4 * 1.15 * 1.25, 5);
    expect(delta).toBeGreaterThan(0.25);
  });

  it("age 30, unused, grows slowly", () => {
    const delta = growth({
      age: 30,
      attribute: "passing",
      value: 140,
      anlage: 1,
      drive: 0.8,
      minutes: 0,
    });
    expect(delta).toBeCloseTo(0.07 * 0.65 * 1 * 0.8 * 0.7 * 1.25, 5);
    expect(delta).toBeLessThan(0.04);
  });

  it("age 25 at 180 applies the 0.3 soft cap before the clamp", () => {
    const delta = growth({
      age: 25,
      attribute: "passing",
      value: 180,
      anlage: 1.1,
      drive: 1.2,
      minutes: 45,
    });
    const uncapped = 0.07 * 1.45 * 1.1 * 1.2 * (1 + (45 / 90) * 0.15) * 1.25;
    expect(delta).toBeCloseTo(uncapped * 0.3, 5);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThanOrEqual(5);
  });

  it("age 33 pace declines once decay is subtracted", () => {
    const delta = growth({
      age: 33,
      attribute: "pace",
      value: 130,
      anlage: 1,
      drive: 1,
      minutes: 0,
    });
    expect(delta).toBeCloseTo(0.07 * 0.28 * 0.7 * 1.25 - 1.5 / 52, 5);
    expect(delta).toBeLessThan(0);
    expect(decayPerWeek("pace", 33)).toBeCloseTo(1.5 / 52, 8);
  });
});

describe("playing time gate", () => {
  it("dampens pro growth when season apps fall below half of matchdays", () => {
    const full = growth({
      age: 20,
      attribute: "passing",
      value: 100,
      anlage: 1.1,
      drive: 1.1,
      minutes: 70,
      squadStatus: "pro",
      seasonApps: 12,
      leagueMatchdaysPlayed: 20,
    });
    const bench = growth({
      age: 20,
      attribute: "passing",
      value: 100,
      anlage: 1.1,
      drive: 1.1,
      minutes: 70,
      squadStatus: "pro",
      seasonApps: 2,
      leagueMatchdaysPlayed: 20,
    });
    expect(full).toBeGreaterThan(bench * 1.2);
  });
});

describe("growth constraints", () => {
  it("draws the published Gaussian sigma per attribute group", () => {
    const cases = [
      ["passing", 0.15],
      ["pace", 0.2],
      ["composure", 0.1],
    ] as const;
    for (const [attribute, expectedSigma] of cases) {
      const random = deterministicRandom(attribute.length * 101);
      const draws = Array.from({ length: 20_000 }, () => sampleNoise(attribute, random));
      const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
      const variance =
        draws.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
        draws.length;
      expect(mean).toBeCloseTo(1, 1);
      expect(Math.sqrt(variance)).toBeCloseTo(expectedSigma, 1);
      expect(attributeSigma(attribute)).toBe(expectedSigma);
    }
  });

  it("loads the published decline ages", () => {
    const curves = JSON.parse(
      readFileSync(new URL("../../data/rules/growth_curves.json", import.meta.url), "utf8"),
    ) as {
      learning_base_points_per_week: number;
      pace: { decline_start: number };
      stamina: { decline_start: number };
      leadership: { per_year: number };
    };
    expect(curves.learning_base_points_per_week).toBe(0.07);
    expect(curves.pace.decline_start).toBe(25);
    expect(curves.stamina.decline_start).toBe(27);
    expect(curves.leadership.per_year).toBe(0);
    expect(decayPerWeek("pace", 24)).toBe(0);
    expect(decayPerWeek("stamina", 27)).toBeCloseTo(1.2 / 52, 8);
    expect(decayPerWeek("leadership", 40)).toBe(0);
  });

  it("an injured week has no positive term, so only decay remains", () => {
    const delta = growth({
      age: 33,
      attribute: "pace",
      value: 130,
      anlage: 1,
      drive: 1,
      minutes: 90,
      injured: true,
      focusSlots: 1,
    });
    expect(delta).toBeCloseTo(-(1.5 / 52), 5);
  });

  it("clamps a weekly delta to +5 and stores at most 199", () => {
    const delta = growth({
      age: 19,
      attribute: "passing",
      value: 100,
      anlage: 1.5,
      drive: 1.6,
      minutes: 90,
      focusSlots: 2,
      noise: 2,
      environmentFactor: 100,
    });
    expect(delta).toBe(5);
    expect(applyGrowth(197, delta)).toBe(199);
  });
});

function deterministicRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}
