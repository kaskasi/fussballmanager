import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyGrowth,
  calculateWeeklyGrowth,
  decayPerWeek,
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

  it("age 19, 90 minutes, grows by 2.898", () => {
    const delta = growth({
      age: 19,
      attribute: "passing",
      value: 100,
      anlage: 1.2,
      drive: 1.4,
      minutes: 90,
    });
    expect(delta).toBeCloseTo(2.898, 3);
    expect(delta).toBeGreaterThan(2);
  });

  it("age 30, unused, grows by 0.392", () => {
    const delta = growth({
      age: 30,
      attribute: "passing",
      value: 140,
      anlage: 1,
      drive: 0.8,
      minutes: 0,
    });
    expect(delta).toBeCloseTo(0.392, 3);
    expect(delta).toBeLessThan(0.5);
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
    const uncapped = 1 * 1.1 * 1.2 * (1 + (45 / 90) * 0.15);
    expect(delta).toBeCloseTo(uncapped * 0.3, 5);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThanOrEqual(5);
  });

  it("age 33 pace stays slightly positive once decay is subtracted", () => {
    const delta = growth({
      age: 33,
      attribute: "pace",
      value: 130,
      anlage: 1,
      drive: 1,
      minutes: 0,
    });
    expect(delta).toBeCloseTo(0.28 * 0.7 - 1.5 / 52, 5);
    expect(delta).toBeGreaterThan(0);
    expect(decayPerWeek("pace", 33)).toBeCloseTo(1.5 / 52, 8);
  });
});

describe("growth constraints", () => {
  it("loads the published decline ages", () => {
    const curves = JSON.parse(
      readFileSync(new URL("../../data/rules/growth_curves.json", import.meta.url), "utf8"),
    ) as {
      pace: { decline_start: number };
      stamina: { decline_start: number };
      leadership: { per_year: number };
    };
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
    });
    expect(delta).toBe(5);
    expect(applyGrowth(197, delta)).toBe(199);
  });
});
