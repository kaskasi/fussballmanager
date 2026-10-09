import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { defaultClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import {
  advanceMerchandisingWeek,
  deliverMerchandisingOrders,
  orderMerchOnDemand,
  defaultClubMerchandising,
  isMerchSkuOnSale,
  jerseySalesWeights,
  MERCH_OVERCAP_DISCARD_AFTER_WEEKS,
  MERCH_SALE_DURATION_WEEKS,
  merchMaxStockForSku,
  startMerchSkuSale,
  weeklyMerchandisingEconomics,
} from "./merchandising.ts";
import { MERCH_SKU_IDS } from "./merchandising-skus.ts";
import { refreshMerchBulkMarket } from "./merchandising-market.ts";
import { fanshopMerchLevel, merchMaxBulkOfferSlots } from "./merchandising-capacity.ts";

describe("merchandising inventory", () => {
  it("weights jersey sales toward higher market value", () => {
    const star = clonePlayer();
    star.club_id = "cl_fc_nordstern";
    star.squad_status = "pro";
    star.market_value = 4_000_000;
    star.name = { first: "Star", last: "One" };
    const bench = clonePlayer();
    bench.id = "bench-player";
    bench.club_id = "cl_fc_nordstern";
    bench.squad_status = "pro";
    bench.market_value = 120_000;
    bench.name = { first: "Bench", last: "Two" };
    const weights = jerseySalesWeights([star, bench], "cl_fc_nordstern");
    expect(weights[0]!.playerId).toBe(star.id);
    expect(weights[0]!.share).toBeGreaterThan(weights[1]!.share);
  });

  it("reduces stock when the week advances", () => {
    const stadium = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    const before = stadium.merchandising!.skus.trikots.stock;
    const step = advanceMerchandisingWeek(stadium, {
      stadium,
      players: [],
      clubId: "cl_fc_nordstern",
      occupancy: 1,
      isHomeMatchWeek: true,
      week: 2,
      season: 1,
      masterSeed: 42,
    });
    expect(step.stadium.merchandising!.skus.trikots.stock).toBeLessThanOrEqual(before);
    expect(step.economics.net).toBeGreaterThanOrEqual(0);
  });

  it("queues on demand stock and delivers after two days", () => {
    const stadium: ClubStadium = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    const before = stadium.merchandising!.skus.caps.stock;
    const result = orderMerchOnDemand(stadium, "caps", 10, 1, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.stadium.merchandising!.on_demand_queue?.length).toBe(1);
    expect(result!.stadium.merchandising!.skus.caps.stock).toBe(before);
    const delivered = deliverMerchandisingOrders(result!.stadium, 1, 1, 3);
    expect(delivered.merchandising!.skus.caps.stock).toBeGreaterThan(before);
  });

  it("spawns at least two starter bulk offers when empty", () => {
    const seeded = refreshMerchBulkMarket([], 1, 1, 99, undefined, 2);
    expect(seeded.offers.length).toBeGreaterThanOrEqual(2);
    for (const offer of seeded.offers) {
      const withStock = MERCH_SKU_IDS.filter((id) => (offer.units[id] ?? 0) > 0);
      expect(withStock.length).toBe(1);
    }
    const high = refreshMerchBulkMarket([], 1, 3, 99, undefined, 5);
    expect(high.offers.length).toBeGreaterThan(0);
    expect(high.offers.length).toBeLessThanOrEqual(5);
  });

  it("does not restore bought whitelabel offers in the same week", () => {
    const seeded = refreshMerchBulkMarket([], 1, 1, 99, undefined, 2);
    const boughtId = seeded.offers[0]!.id;
    const afterBuy = seeded.offers.filter((offer) => offer.id !== boughtId);
    const sameWeek = refreshMerchBulkMarket(
      afterBuy,
      1,
      1,
      99,
      seeded.refreshWeek,
      2,
    );
    expect(sameWeek.offers.some((offer) => offer.id === boughtId)).toBe(false);
    expect(sameWeek.offers.length).toBe(1);
  });

  it("raises stock cap and offer slots with fanshop level", () => {
    expect(merchMaxBulkOfferSlots(0)).toBe(2);
    expect(merchMaxBulkOfferSlots(1)).toBe(2);
    expect(merchMaxBulkOfferSlots(5)).toBe(5);
    expect(merchMaxStockForSku(4, "trikots")).toBeGreaterThan(
      merchMaxStockForSku(1, "trikots"),
    );
    expect(fanshopMerchLevel(undefined)).toBe(0);
  });

  it("sells less when retail price is very high", () => {
    const cheap = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    const pricey = {
      ...cheap,
      merchandising: {
        ...defaultClubMerchandising(),
        skus: {
          ...defaultClubMerchandising().skus,
          shirts: {
            ...defaultClubMerchandising().skus.shirts,
            retail_price: 120,
          },
        },
      },
    };
    const cheapEcon = weeklyMerchandisingEconomics({
      stadium: cheap,
      players: [],
      clubId: "cl_fc_nordstern",
      occupancy: 1,
      isHomeMatchWeek: true,
      week: 1,
      season: 1,
      masterSeed: 1,
    });
    const priceyEcon = weeklyMerchandisingEconomics({
      stadium: pricey,
      players: [],
      clubId: "cl_fc_nordstern",
      occupancy: 1,
      isHomeMatchWeek: true,
      week: 1,
      season: 1,
      masterSeed: 1,
    });
    expect(priceyEcon.unitsSold.shirts ?? 0).toBeLessThanOrEqual(cheapEcon.unitsSold.shirts ?? 0);
  });

  it("runs timed fire sale for two weeks then restores normal retail", () => {
    let stadium: ClubStadium = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    const normal = stadium.merchandising!.skus.shirts.retail_price;
    stadium = startMerchSkuSale(stadium, "shirts", 30, 1, 1);
    expect(stadium.merchandising!.skus.shirts.retail_price).toBe(30);
    expect(stadium.merchandising!.skus.shirts.retail_price_normal).toBe(normal);

    const ctx = {
      stadium,
      players: [] as const,
      clubId: "cl_fc_nordstern",
      occupancy: 1,
      isHomeMatchWeek: false,
      season: 1,
      masterSeed: 7,
    };

    for (let w = 1; w <= MERCH_SALE_DURATION_WEEKS; w++) {
      const step = advanceMerchandisingWeek(stadium, { ...ctx, week: w });
      stadium = step.stadium;
      expect(isMerchSkuOnSale(stadium.merchandising!.skus.shirts, w)).toBe(true);
    }

    const after = advanceMerchandisingWeek(stadium, { ...ctx, week: 3 });
    const row = after.stadium.merchandising!.skus.shirts;
    expect(row.retail_price).toBe(normal);
    expect(row.retail_price_normal).toBeUndefined();
    expect(row.sale_until_career_week).toBeUndefined();
  });

  it("records sale summary when a fire sale ends", () => {
    let stadium: ClubStadium = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    stadium = startMerchSkuSale(stadium, "shirts", 25, 1, 1);
    const ctx = {
      stadium,
      players: [] as const,
      clubId: "cl_fc_nordstern",
      occupancy: 1,
      isHomeMatchWeek: true,
      season: 1,
      masterSeed: 11,
    };
    for (let w = 1; w <= MERCH_SALE_DURATION_WEEKS; w++) {
      const step = advanceMerchandisingWeek(stadium, { ...ctx, week: w });
      stadium = step.stadium;
    }
    const endStep = advanceMerchandisingWeek(stadium, { ...ctx, week: 3 });
    expect(endStep.saleSummaries.length).toBe(1);
    expect(endStep.saleSummaries[0]!.sku).toBe("shirts");
    expect(endStep.stadium.merchandising!.pending_sale_summaries?.length).toBe(1);
  });

  it("discards excess stock after more than four weeks over capacity", () => {
    let stadium: ClubStadium = {
      ...defaultClubStadium(),
      merchandising: defaultClubMerchandising(),
    };
    const max = merchMaxStockForSku(0, "caps");
    stadium.merchandising!.skus.caps.stock = max + 500;
    const ctx = {
      stadium,
      players: [] as const,
      clubId: "cl_fc_nordstern",
      occupancy: 0.2,
      isHomeMatchWeek: false,
      season: 1,
      masterSeed: 3,
    };
    let disposals = 0;
    for (let w = 1; w <= MERCH_OVERCAP_DISCARD_AFTER_WEEKS + 1; w++) {
      const step = advanceMerchandisingWeek(stadium, { ...ctx, week: w, stadium });
      stadium = step.stadium;
      disposals += step.stockDisposals.length;
    }
    expect(disposals).toBeGreaterThan(0);
    expect(stadium.merchandising!.skus.caps.stock).toBeLessThanOrEqual(max);
  });
});
