import {
  dockedOccupiedCells,
  precinctBuildingLevel,
  type PrecinctState,
} from "../stadium/precinct.ts";
import {
  MERCH_START_STOCK_FILL,
  MERCH_WEEKS_AT_FULL_STOCK,
  referenceWeeklySkuDemandUnits,
} from "./merchandising-baseline.ts";
import { MERCH_UNIT_SCALE, type MerchSkuId } from "./merchandising-skus.ts";

export {
  MERCH_SALES_DEMAND_MULTIPLIER,
  MERCH_UNIT_SCALE,
} from "./merchandising-skus.ts";
export {
  MERCH_START_STOCK_FILL,
  MERCH_WEEKS_AT_FULL_STOCK,
} from "./merchandising-baseline.ts";

/** Docked Fanshop building level (0 = nur Online-Baseline). */
export function fanshopMerchLevel(precinct: PrecinctState | undefined): number {
  if (!precinct) return 0;
  if (dockedOccupiedCells(precinct, "fanshop") <= 0) return 0;
  return precinctBuildingLevel(precinct, "fanshop");
}

/** Max units storable per SKU — Stufe 1 ≈ {@link MERCH_WEEKS_AT_FULL_STOCK} Wochen Vollverkauf. */
export function merchMaxStockForSku(fanshopLevel: number, sku: MerchSkuId): number {
  const level = Math.max(0, Math.min(5, fanshopLevel));
  const weekly = referenceWeeklySkuDemandUnits(sku, level);
  return Math.round(weekly * MERCH_WEEKS_AT_FULL_STOCK);
}

export function defaultMerchStartStock(sku: MerchSkuId): number {
  return Math.round(
    merchMaxStockForSku(1, sku) * MERCH_START_STOCK_FILL,
  );
}

export function merchStockFillRatio(
  stock: number,
  fanshopLevel: number,
  sku: MerchSkuId,
): number {
  const max = merchMaxStockForSku(fanshopLevel, sku);
  if (max <= 0) return 0;
  return stock / max;
}

export function isMerchOverCapacity(
  stock: number,
  fanshopLevel: number,
  sku: MerchSkuId,
): boolean {
  return stock > merchMaxStockForSku(fanshopLevel, sku);
}

export const MERCH_MARKET_POOL_MIN = 48;
export const MERCH_MARKET_POOL_MAX = 96;

/** Active whitelabel offers in the weekly market pool (Fanshop level 0→48 … 5→96). */
export function merchMarketPoolSize(fanshopLevel: number): number {
  const level = Math.max(0, Math.min(5, fanshopLevel));
  const span = MERCH_MARKET_POOL_MAX - MERCH_MARKET_POOL_MIN;
  return MERCH_MARKET_POOL_MIN + Math.round((span * level) / 5);
}

/** @deprecated Use merchMarketPoolSize — same value, legacy name for migrations. */
export function merchMaxBulkOfferSlots(fanshopLevel: number): number {
  return merchMarketPoolSize(fanshopLevel);
}

export function merchStockRoom(
  fanshopLevel: number,
  sku: MerchSkuId,
  currentStock: number,
): number {
  return Math.max(0, merchMaxStockForSku(fanshopLevel, sku) - currentStock);
}
