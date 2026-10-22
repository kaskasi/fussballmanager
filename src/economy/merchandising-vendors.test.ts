import { describe, expect, it } from "vitest";
import { calendarWeek } from "../sim/game-calendar.ts";
import {
  expressPremium,
  expressPromoMultiplier,
  EXPRESS_PROMO_DISCOUNT,
  grosshaendlerPriceMultiplier,
  insolvenzListingChance,
  isExpressPromoWeek,
  merchVendorPurchasesToNextTier,
  normalizeMarketVendorId,
  recordMerchVendorPurchase,
  restpostenPoolShare,
  vendorRelationTier,
} from "./merchandising-vendors.ts";

describe("vendor relationship tiers", () => {
  it("starts at Neu and climbs at 3 / 8 / 15 purchases", () => {
    expect(vendorRelationTier(undefined, "grosshaendler")).toBe(0);
    expect(vendorRelationTier({ grosshaendler: { purchases: 2 } }, "grosshaendler")).toBe(0);
    expect(vendorRelationTier({ grosshaendler: { purchases: 3 } }, "grosshaendler")).toBe(1);
    expect(vendorRelationTier({ grosshaendler: { purchases: 8 } }, "grosshaendler")).toBe(2);
    expect(vendorRelationTier({ grosshaendler: { purchases: 40 } }, "grosshaendler")).toBe(3);
  });

  it("counts purchases per vendor without touching others", () => {
    let relations = recordMerchVendorPurchase(undefined, "restposten");
    relations = recordMerchVendorPurchase(relations, "restposten");
    relations = recordMerchVendorPurchase(relations, "express");
    expect(relations).toEqual({ restposten: { purchases: 2 }, express: { purchases: 1 } });
    expect(merchVendorPurchasesToNextTier(relations, "restposten")).toBe(1);
    expect(merchVendorPurchasesToNextTier({ express: { purchases: 15 } }, "express")).toBeNull();
  });

  it("perks improve with tier", () => {
    expect(grosshaendlerPriceMultiplier(0)).toBe(1);
    expect(grosshaendlerPriceMultiplier(3)).toBeCloseTo(0.91);
    expect(restpostenPoolShare(2)).toBeGreaterThan(restpostenPoolShare(0));
    expect(insolvenzListingChance(3)).toBeGreaterThan(insolvenzListingChance(0));
    expect(expressPremium(0)).toBeCloseTo(1.42);
    expect(expressPremium(3)).toBeCloseTo(1.18);
  });
});

describe("Express promo weeks (former Phillip sale)", () => {
  it("covers season weeks 2–3 and calendar weeks 2–3", () => {
    expect(isExpressPromoWeek(2)).toBe(true);
    expect(isExpressPromoWeek(3)).toBe(true);
    expect(isExpressPromoWeek(1)).toBe(false);
    expect(isExpressPromoWeek(4)).toBe(false);
    const january = Array.from({ length: 30 }, (_, i) => i + 10).filter(
      (w) => calendarWeek(w) === 2 || calendarWeek(w) === 3,
    );
    expect(january.length).toBeGreaterThan(0);
    for (const w of january) expect(isExpressPromoWeek(w)).toBe(true);
  });

  it("discounts only via the multiplier", () => {
    expect(expressPromoMultiplier(2)).toBeCloseTo(1 - EXPRESS_PROMO_DISCOUNT);
    expect(expressPromoMultiplier(5)).toBe(1);
  });
});

describe("normalizeMarketVendorId", () => {
  it("maps legacy or unknown offers to the Großhändler", () => {
    expect(normalizeMarketVendorId(undefined)).toBe("grosshaendler");
    expect(normalizeMarketVendorId("express")).toBe("grosshaendler");
    expect(normalizeMarketVendorId("restposten")).toBe("restposten");
  });
});
