export const MERCH_UNIT_SCALE = 10;

export type MerchSkuId =
  | "trikots"
  | "shirts"
  | "caps"
  | "schals"
  | "socken"
  | "bettwaesche"
  | "handtuecher";

export const MERCH_SKU_IDS: readonly MerchSkuId[] = [
  "trikots",
  "shirts",
  "caps",
  "schals",
  "socken",
  "bettwaesche",
  "handtuecher",
] as const;

export const MERCH_SKU_LABEL: Record<MerchSkuId, string> = {
  trikots: "Trikots",
  shirts: "Shirts & Hoodies",
  caps: "Caps",
  schals: "Schals",
  socken: "Socken",
  bettwaesche: "Bettwäsche",
  handtuecher: "Handtücher",
};

/** Relative demand when stock is available. */
export const MERCH_SKU_DEMAND_WEIGHT: Record<MerchSkuId, number> = {
  trikots: 0.3,
  shirts: 0.18,
  caps: 0.11,
  schals: 0.14,
  socken: 0.09,
  bettwaesche: 0.1,
  handtuecher: 0.08,
};

/** Suggested retail & wholesale reference (€/unit). */
export const MERCH_SKU_REFERENCE_RETAIL: Record<MerchSkuId, number> = {
  trikots: 72,
  shirts: 38,
  caps: 22,
  schals: 24,
  socken: 14,
  bettwaesche: 45,
  handtuecher: 28,
};

export const MERCH_SKU_REFERENCE_COST: Record<MerchSkuId, number> = {
  trikots: 28,
  shirts: 14,
  caps: 7,
  schals: 8,
  socken: 5,
  bettwaesche: 16,
  handtuecher: 10,
};

export interface MerchSkuState {
  stock: number;
  avg_cost: number;
  retail_price: number;
  /** VK vor zeitlich begrenztem Fire Sale (wird danach wiederhergestellt). */
  retail_price_normal?: number;
  /** Erste Karriere-Woche nach Ende des Sales (VK zurück auf normal). */
  sale_until_career_week?: number;
}

export function emptySkuState(id: MerchSkuId): MerchSkuState {
  return {
    stock: 0,
    avg_cost: MERCH_SKU_REFERENCE_COST[id],
    retail_price: MERCH_SKU_REFERENCE_RETAIL[id],
  };
}

export function defaultSkuInventory(): Record<MerchSkuId, MerchSkuState> {
  return Object.fromEntries(
    MERCH_SKU_IDS.map((id) => [
      id,
      {
        stock: id === "trikots" ? 480 : id === "shirts" ? 600 : 350,
        avg_cost: MERCH_SKU_REFERENCE_COST[id],
        retail_price: MERCH_SKU_REFERENCE_RETAIL[id],
      },
    ]),
  ) as Record<MerchSkuId, MerchSkuState>;
}

export function mergeStock(
  current: MerchSkuState,
  addUnits: number,
  unitCost: number,
  maxStock?: number,
): MerchSkuState {
  if (addUnits <= 0) return current;
  let added = addUnits;
  if (maxStock != null) {
    added = Math.min(addUnits, Math.max(0, maxStock - current.stock));
  }
  if (added <= 0) return current;
  const totalUnits = current.stock + added;
  const avg_cost =
    (current.stock * current.avg_cost + added * unitCost) / totalUnits;
  return {
    ...current,
    stock: totalUnits,
    avg_cost: Math.round(avg_cost * 100) / 100,
  };
}
