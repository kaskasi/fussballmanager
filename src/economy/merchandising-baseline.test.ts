import { describe, expect, it } from "vitest";
import {
  MERCH_START_STOCK_FILL,
  MERCH_WEEKS_AT_FULL_STOCK,
  referenceWeeklySkuDemandUnits,
} from "./merchandising-baseline.ts";
import {
  defaultMerchStartStock,
  merchMaxStockForSku,
} from "./merchandising-capacity.ts";
import { defaultClubMerchandising } from "./merchandising.ts";
import { MERCH_SKU_IDS } from "./merchandising-skus.ts";

describe("merchandising baseline capacity", () => {
  it("sizes level-1 max stock to eight reference-demand weeks per SKU", () => {
    for (const sku of MERCH_SKU_IDS) {
      const weekly = referenceWeeklySkuDemandUnits(sku, 1);
      expect(merchMaxStockForSku(1, sku)).toBe(Math.round(weekly * MERCH_WEEKS_AT_FULL_STOCK));
    }
  });

  it("starts new clubs at about 25% of level-1 capacity", () => {
    const merch = defaultClubMerchandising();
    for (const sku of MERCH_SKU_IDS) {
      const max = merchMaxStockForSku(1, sku);
      const stock = merch.skus[sku]!.stock;
      expect(stock).toBe(defaultMerchStartStock(sku));
      expect(stock / max).toBeCloseTo(MERCH_START_STOCK_FILL, 2);
    }
  });
});
