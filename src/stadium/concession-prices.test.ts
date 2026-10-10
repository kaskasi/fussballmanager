import { describe, expect, it } from "vitest";
import {
  applyConcessionPriceToIncome,
  CONCESSION_PRICE_ELASTICITY,
  DEFAULT_BEER_UNIT_PRICE_EUR,
  DEFAULT_KIOSK_UNIT_PRICE_EUR,
  concessionDemandMultiplier,
} from "./concession-prices.ts";

describe("concession unit pricing", () => {
  const base = 10_000;

  it("is neutral at reference price", () => {
    expect(
      applyConcessionPriceToIncome(base, DEFAULT_KIOSK_UNIT_PRICE_EUR, DEFAULT_KIOSK_UNIT_PRICE_EUR),
    ).toBe(base);
  });

  it("raises revenue modestly below elastic cap but lowers effective demand at high price", () => {
    const high = DEFAULT_KIOSK_UNIT_PRICE_EUR * 2;
    const low = DEFAULT_KIOSK_UNIT_PRICE_EUR * 0.5;
    const atHigh = applyConcessionPriceToIncome(base, high, DEFAULT_KIOSK_UNIT_PRICE_EUR);
    const atLow = applyConcessionPriceToIncome(base, low, DEFAULT_KIOSK_UNIT_PRICE_EUR);
    expect(concessionDemandMultiplier(high, DEFAULT_KIOSK_UNIT_PRICE_EUR)).toBeLessThan(1);
    expect(concessionDemandMultiplier(low, DEFAULT_KIOSK_UNIT_PRICE_EUR)).toBeGreaterThan(1);
    expect(atHigh).toBeLessThan(base * 2);
    expect(atLow).toBeGreaterThan(base * 0.5);
  });

  it("uses configured elasticity", () => {
    const demand = concessionDemandMultiplier(8, DEFAULT_BEER_UNIT_PRICE_EUR, CONCESSION_PRICE_ELASTICITY);
    expect(demand).toBeCloseTo(Math.pow(DEFAULT_BEER_UNIT_PRICE_EUR / 8, CONCESSION_PRICE_ELASTICITY), 5);
  });
});
