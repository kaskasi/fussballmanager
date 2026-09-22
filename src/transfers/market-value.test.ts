import { describe, expect, it } from "vitest";
import type { Attributes } from "../types/player.ts";
import {
  ageCurveFactor,
  baseAttributeValue,
  contractFactor,
  estimateCa,
  marketValue,
  type MarketValueInput,
} from "./market-value.ts";

const flat = (value: number): Attributes => ({
  shooting: value,
  passing: value,
  dribbling: value,
  technique: value,
  pace: value,
  strength: value,
  stamina: value,
  composure: value,
  leadership: value,
  positioning: value,
  vision: value,
  concentration: value,
  teamwork: value,
  weak_foot: value,
  gk_handling: value,
});

function priced(overrides: Partial<MarketValueInput> = {}): number {
  return marketValue({
    ca: 100,
    age: 25,
    monthsRemaining: 24,
    wage: 1000,
    marketWage: 1000,
    demandFactor: 1,
    reputationFactor: 1,
    ...overrides,
  });
}

describe("PRD 05.10 market value", () => {
  it("prices CA 60 at 200_000 and CA 100 at about 3.49M", () => {
    expect(baseAttributeValue(60)).toBe(200_000);
    const at100 = baseAttributeValue(100);
    expect(at100).toBeGreaterThan(3_490_000 * 0.99);
    expect(at100).toBeLessThan(3_490_000 * 1.01);
  });

  it("halves a contract of 6 months or less", () => {
    expect(contractFactor(5, 0, 1)).toBeCloseTo(0.5104166667, 5);
    expect(contractFactor(5, 0, 1)).toBeLessThanOrEqual(0.6);
    expect(contractFactor(6, 0, 1)).toBeCloseTo(0.5125, 5);
    expect(contractFactor(6, 0, 1)).not.toBeCloseTo(1.02, 2);
    expect(contractFactor(0, 0, 1)).toBe(0.5);
    expect(contractFactor(7, 0, 1)).toBeCloseTo(1 + (7 / 36) * 0.15, 5);
  });

  it("prices a buyer's 20% lower CA under the owner's value", () => {
    const shared = { age: 19, monthsRemaining: 18, wage: 500, marketWage: 800, demandFactor: 1, reputationFactor: 1 };
    const owner = marketValue({ ...shared, ca: 100 });
    const buyer = marketValue({ ...shared, ca: 80 });
    expect(buyer).toBeLessThan(owner);
    expect(buyer / owner).toBeCloseTo(Math.pow(0.8, 5.6), 5);
    expect(estimateCa(flat(100), "CM")).toBe(100);
    expect(estimateCa(flat(80), "LW")).toBe(80);
  });

  it("repeats for the same inputs", () => {
    const input: MarketValueInput = {
      ca: 110,
      age: 19,
      monthsRemaining: 0,
      wage: 0,
      marketWage: 0,
      demandFactor: 1.1,
      reputationFactor: 1.05,
      estimatedGrowthRateNormalized: 0.4,
    };
    expect(marketValue(input)).toBe(marketValue(input));
  });
});

describe("market value factors", () => {
  it("adds the youth growth premium only under 20", () => {
    expect(ageCurveFactor(19, 0)).toBeCloseTo(0.7, 5);
    expect(ageCurveFactor(19, 1)).toBeCloseTo(0.7 * 1.6, 5);
    expect(ageCurveFactor(20, 1)).toBeCloseTo(0.82, 5);
    expect(ageCurveFactor(35, 1)).toBe(0.12);
  });

  it("cuts the factor when wage is more than 30% over the market wage", () => {
    expect(contractFactor(36, 131, 100)).toBeCloseTo(1.15 * 0.85, 5);
    expect(contractFactor(36, 130, 100)).toBeCloseTo(1.15, 5);
  });

  it("keeps demand and reputation inside the published bounds", () => {
    const mid = priced();
    expect(priced({ demandFactor: 1.5, reputationFactor: 2 })).toBeCloseTo(mid * 1.2 * 1.15, 5);
    expect(priced({ demandFactor: 0.5, reputationFactor: 0.5 })).toBeCloseTo(mid * 0.85 * 0.95, 5);
  });
});
