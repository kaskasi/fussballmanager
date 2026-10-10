import { describe, expect, it } from "vitest";
import { merchMarketPoolSize } from "./merchandising-capacity.ts";
import {
  bestMarketBulkUnitCost,
  bulkOfferUnitCost,
  customOrderUnitCost,
  MERCH_ON_DEMAND_MARKET_PREMIUM,
  offerPrimaryQty,
  primaryMerchSku,
  refreshMerchBulkMarket,
  seedInitialMerchBulkOffers,
} from "./merchandising-market.ts";

describe("on-demand vs bulk market", () => {
  it("uses best bulk unit cost, not inventory avg cost", () => {
    const pool = merchMarketPoolSize(1);
    const seeded = refreshMerchBulkMarket([], 1, 1, 99, undefined, pool);
    const sku = primaryMerchSku(seeded.offers[0]!.units)!;
    const bulkUnit = bestMarketBulkUnitCost(sku, seeded.offers)!;
    const onDemand = customOrderUnitCost(sku, 999, 1, seeded.offers);
    expect(onDemand).toBeLessThan(999);
    expect(onDemand).toBe(Math.round(bulkUnit * MERCH_ON_DEMAND_MARKET_PREMIUM * 100) / 100);
  });

  it("bestMarketBulkUnitCost picks lowest offer for sku", () => {
    const pool = merchMarketPoolSize(3);
    const offers = refreshMerchBulkMarket([], 1, 5, 77, undefined, pool).offers;
    const sockenOffers = offers.filter((o) => (o.units.socken ?? 0) > 0);
    if (sockenOffers.length === 0) return;
    const expected = Math.min(...sockenOffers.map((o) => bulkOfferUnitCost(o)));
    expect(bestMarketBulkUnitCost("socken", offers)).toBe(expected);
  });
});

describe("market pool size and lot spread", () => {
  it("fills pool to fanshop capacity", () => {
    const pool = merchMarketPoolSize(2);
    const offers = seedInitialMerchBulkOffers(4242, 1, 3, pool);
    expect(offers.length).toBe(pool);
  });

  it("includes micro and whale lots for fixed seed", () => {
    const pool = merchMarketPoolSize(5);
    const { offers } = refreshMerchBulkMarket([], 1, 8, 12345, undefined, pool);
    const qtys = offers.map((o) => offerPrimaryQty(o));
    expect(qtys.some((q) => q <= 50)).toBe(true);
    expect(qtys.some((q) => q >= 5000)).toBe(true);
  });
});
