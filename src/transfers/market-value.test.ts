import { describe, expect, it } from "vitest";
import type { Attributes } from "../types/player.ts";
import {
  ageCurveFactor,
  baseAttributeValue,
  contractFactor,
  developmentUpsideFactor,
  estimateCa,
  marketValue,
  marketValueBreakdown,
  presentValueFactor,
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
  it("prices CA 60 at 200_000 and CA 100 at about 3.49M base", () => {
    expect(baseAttributeValue(60)).toBe(200_000);
    const at100 = baseAttributeValue(100);
    expect(at100).toBeGreaterThan(3_490_000 * 0.99);
    expect(at100).toBeLessThan(3_490_000 * 1.01);
  });

  it("values a 15-year-old CA 99 talent above a 25-year-old at the same CA", () => {
    const shared = {
      ca: 99,
      monthsRemaining: 24,
      wage: 800,
      marketWage: 800,
      demandFactor: 1,
      reputationFactor: 1,
      estimatedGrowthRateNormalized: 0.5,
    };
    const teen = marketValue({ ...shared, age: 15, squadStatus: "u17" as const });
    const peak = marketValue({ ...shared, age: 25, squadStatus: "pro" as const });
    expect(teen).toBeGreaterThan(peak);
    expect(teen).toBeGreaterThan(4_000_000);
    expect(teen).toBeLessThan(8_000_001);
    expect(peak).toBeGreaterThan(3_000_000);
    expect(peak).toBeLessThan(4_500_000);
  });

  it("does not explode market value for average youth", () => {
    const teen = marketValue({
      ca: 60,
      age: 15,
      monthsRemaining: 0,
      wage: 0,
      marketWage: 1,
      demandFactor: 1,
      reputationFactor: 1,
      estimatedGrowthRateNormalized: 0.3,
      squadStatus: "u17",
    });
    expect(teen).toBeGreaterThan(150_000);
    expect(teen).toBeLessThan(900_000);
  });

  it("halves a contract of 6 months or less for pros", () => {
    expect(contractFactor(5, 0, 1)).toBeCloseTo(0.5104166667, 5);
    expect(contractFactor(0, 0, 1)).toBe(0.5);
    expect(contractFactor(6, 0, 1, { youthAcademy: true })).toBeGreaterThanOrEqual(0.82);
  });

  it("prices a buyer's 20% lower CA under the owner's value", () => {
    const shared = { age: 25, monthsRemaining: 18, wage: 500, marketWage: 800, demandFactor: 1, reputationFactor: 1 };
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
      squadStatus: "u19",
    };
    expect(marketValue(input)).toBe(marketValue(input));
  });
});

describe("market value factors", () => {
  it("uses present value peak at 23–27", () => {
    expect(presentValueFactor(24)).toBe(1);
    expect(presentValueFactor(15)).toBeCloseTo(0.88, 5);
    expect(presentValueFactor(35)).toBe(0.12);
  });

  it("adds development upside only under 21", () => {
    expect(developmentUpsideFactor(15, 99, 0.5)).toBeGreaterThan(1.2);
    expect(developmentUpsideFactor(25, 99, 1)).toBe(1);
  });

  it("legacy ageCurveFactor equals present × development", () => {
    expect(ageCurveFactor(19, 0.4, 100)).toBeCloseTo(
      presentValueFactor(19) * developmentUpsideFactor(19, 100, 0.4),
      8,
    );
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

  it("exposes a breakdown for UI", () => {
    const breakdown = marketValueBreakdown({
      ca: 99,
      age: 15,
      monthsRemaining: 24,
      wage: 500,
      marketWage: 500,
      demandFactor: 1,
      reputationFactor: 1,
      estimatedGrowthRateNormalized: 0.5,
      squadStatus: "u17",
    });
    expect(breakdown.total).toBeCloseTo(
      breakdown.base *
        breakdown.presentFactor *
        breakdown.developmentFactor *
        breakdown.contractFactor,
      0,
    );
  });
});
