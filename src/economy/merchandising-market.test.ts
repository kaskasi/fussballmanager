import { describe, expect, it } from "vitest";
import { merchMarketPoolSize } from "./merchandising-capacity.ts";
import {
  ageBulkOffers,
  bestMarketBulkUnitCost,
  brandingLeadWeeks,
  bulkOfferUnitCost,
  customOrderUnitCost,
  merchOfferDealPct,
  offerPrimaryQty,
  primaryMerchSku,
  refreshMerchBulkMarket,
  seedInitialMerchBulkOffers,
  type MerchBulkOffer,
} from "./merchandising-market.ts";
import { expressPremium, expressPromoMultiplier } from "./merchandising-vendors.ts";

function marketOverWeeks(seed: number, weeks: number, relations = {}): MerchBulkOffer[] {
  const pool = merchMarketPoolSize(3);
  const all: MerchBulkOffer[] = [];
  for (let week = 1; week <= weeks; week++) {
    all.push(...refreshMerchBulkMarket([], 1, week, seed, undefined, pool, relations).offers);
  }
  return all;
}

describe("Express on-demand vs market", () => {
  it("tracks the best Großhändler price, not inventory avg cost or bargains", () => {
    const pool = merchMarketPoolSize(1);
    const { offers } = refreshMerchBulkMarket([], 1, 5, 99, undefined, pool);
    const sku = primaryMerchSku(offers.find((o) => o.vendor === "grosshaendler")!.units)!;
    const basis = bestMarketBulkUnitCost(sku, offers, "grosshaendler")!;
    const onDemand = customOrderUnitCost(sku, 999, 5, offers);
    expect(onDemand).toBe(Math.round(basis * expressPremium(0) * 100) / 100);
  });

  it("gets cheaper with a better Express tier and in promo weeks", () => {
    const base = customOrderUnitCost("trikots", 0, 5, [], 0);
    expect(customOrderUnitCost("trikots", 0, 5, [], 3)).toBeLessThan(base);
    expect(customOrderUnitCost("trikots", 0, 2, [], 0)).toBeCloseTo(
      base * expressPromoMultiplier(2),
      1,
    );
  });

  it("bestMarketBulkUnitCost picks lowest offer for sku", () => {
    const offers = refreshMerchBulkMarket([], 1, 5, 77, undefined, merchMarketPoolSize(3)).offers;
    const sockenOffers = offers.filter((o) => (o.units.socken ?? 0) > 0);
    if (sockenOffers.length === 0) return;
    const expected = Math.min(...sockenOffers.map((o) => bulkOfferUnitCost(o)));
    expect(bestMarketBulkUnitCost("socken", offers)).toBe(expected);
  });
});

describe("vendor mix", () => {
  it("fills the regular pool to fanshop capacity", () => {
    const pool = merchMarketPoolSize(2);
    const offers = seedInitialMerchBulkOffers(4242, 1, 3, pool);
    expect(offers.length).toBe(pool);
    expect(offers.every((o) => o.vendor === "grosshaendler" || o.vendor === "restposten")).toBe(
      true,
    );
  });

  it("Restposten lots are small and cheaper than Großhändler lots", () => {
    const all = marketOverWeeks(12345, 4);
    const rest = all.filter((o) => o.vendor === "restposten");
    const gross = all.filter((o) => o.vendor === "grosshaendler");
    expect(rest.length).toBeGreaterThan(0);
    expect(gross.length).toBeGreaterThan(rest.length * 0.8);
    expect(Math.max(...rest.map(offerPrimaryQty))).toBeLessThanOrEqual(800);
    const avgDeal = (list: MerchBulkOffer[]) =>
      list.reduce((sum, o) => sum + merchOfferDealPct(o), 0) / list.length;
    expect(avgDeal(rest)).toBeLessThan(avgDeal(gross) - 20);
  });

  it("lists rare Insolvenz whale lots on top of the pool, more often for partners", () => {
    const pool = merchMarketPoolSize(3);
    const count = (relations: object) =>
      Array.from({ length: 120 }, (_, i) => i + 1).filter((week) =>
        refreshMerchBulkMarket([], 1 + Math.floor(week / 52), (week % 52) + 1, 7, undefined, pool, relations)
          .offers.some((o) => o.vendor === "insolvenz"),
      ).length;
    const fresh = count({});
    const partner = count({ insolvenz: { purchases: 20 } });
    expect(fresh).toBeGreaterThan(0);
    expect(partner).toBeGreaterThan(fresh);
    const whale = marketOverWeeks(7, 60).find((o) => o.vendor === "insolvenz");
    if (whale) {
      expect(offerPrimaryQty(whale)).toBeGreaterThanOrEqual(4000);
      expect(merchOfferDealPct(whale)).toBeLessThanOrEqual(-50);
      expect(whale.expires_career_week - whale.listed_career_week).toBe(1);
    }
  });

  it("Großhändler partners see lower list prices", () => {
    const fresh = marketOverWeeks(555, 3).filter((o) => o.vendor === "grosshaendler");
    const partner = marketOverWeeks(555, 3, { grosshaendler: { purchases: 15 } }).filter(
      (o) => o.vendor === "grosshaendler",
    );
    const avg = (list: MerchBulkOffer[]) =>
      list.reduce((sum, o) => sum + merchOfferDealPct(o), 0) / list.length;
    expect(avg(partner)).toBeLessThan(avg(fresh));
  });
});

describe("aging and lead time per vendor", () => {
  it("Restposten prices drop faster than Großhändler prices", () => {
    const offer = (vendor: MerchBulkOffer["vendor"]): MerchBulkOffer => ({
      id: vendor,
      vendor,
      label: "x",
      listed_career_week: 10,
      expires_career_week: 20,
      list_price: 1000,
      ask_price: 1000,
      units: { caps: 100 },
    });
    const [gross, rest] = ageBulkOffers([offer("grosshaendler"), offer("restposten")], 12);
    expect(rest!.ask_price).toBeLessThan(gross!.ask_price);
  });

  it("Restposten ships in one week, Großhändler brands for two plus", () => {
    expect(brandingLeadWeeks({ caps: 300 }, "restposten")).toBe(1);
    expect(brandingLeadWeeks({ caps: 300 }, "grosshaendler")).toBe(2);
    expect(brandingLeadWeeks({ caps: 900 }, "grosshaendler")).toBe(4);
  });

  it("drops expired offers and keeps legacy offers without vendor as Großhändler", () => {
    const legacy = {
      id: "old",
      label: "Caps · Whitelabel",
      listed_career_week: 1,
      expires_career_week: 9,
      list_price: 500,
      ask_price: 500,
      units: { caps: 50 },
    } as unknown as MerchBulkOffer;
    const aged = ageBulkOffers([legacy], 3);
    expect(aged[0]!.vendor).toBe("grosshaendler");
    expect(ageBulkOffers([legacy], 9)).toEqual([]);
  });
});
