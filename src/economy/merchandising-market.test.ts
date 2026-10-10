import { describe, expect, it } from "vitest";
import {
  bestMarketBulkUnitCost,
  bulkOfferUnitCost,
  customOrderUnitCost,
  MERCH_ON_DEMAND_MARKET_PREMIUM,
  primaryMerchSku,
  refreshMerchBulkMarket,
} from "./merchandising-market.ts";

describe("on-demand vs bulk market", () => {
  it("uses best bulk unit cost, not inventory avg cost", () => {
    const seeded = refreshMerchBulkMarket([], 1, 1, 99, undefined, 3);
    const sku = primaryMerchSku(seeded.offers[0]!.units)!;
    const bulkUnit = bestMarketBulkUnitCost(sku, seeded.offers)!;
    const onDemand = customOrderUnitCost(sku, 999, 1, seeded.offers);
    expect(onDemand).toBeLessThan(999);
    expect(onDemand).toBe(Math.round(bulkUnit * MERCH_ON_DEMAND_MARKET_PREMIUM * 100) / 100);
  });

  it("bestMarketBulkUnitCost picks lowest offer for sku", () => {
    const offers = refreshMerchBulkMarket([], 1, 5, 77, undefined, 5).offers;
    const sockenOffers = offers.filter((o) => (o.units.socken ?? 0) > 0);
    if (sockenOffers.length === 0) return;
    const expected = Math.min(...sockenOffers.map((o) => bulkOfferUnitCost(o)));
    expect(bestMarketBulkUnitCost("socken", offers)).toBe(expected);
  });
});
