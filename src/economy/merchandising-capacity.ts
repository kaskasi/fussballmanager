import {
  dockedOccupiedCells,
  precinctBuildingLevel,
  type PrecinctState,
} from "../stadium/precinct.ts";
import { MERCH_UNIT_SCALE, type MerchSkuId } from "./merchandising-skus.ts";

export { MERCH_UNIT_SCALE } from "./merchandising-skus.ts";

/** Docked Fanshop building level (0 = nur Online-Baseline). */
export function fanshopMerchLevel(precinct: PrecinctState | undefined): number {
  if (!precinct) return 0;
  if (dockedOccupiedCells(precinct, "fanshop") <= 0) return 0;
  return precinctBuildingLevel(precinct, "fanshop");
}

const SKU_CAPACITY_FACTOR: Record<MerchSkuId, number> = {
  trikots: 1.35,
  shirts: 1.15,
  caps: 1,
  schals: 1.05,
  socken: 0.85,
  bettwaesche: 0.9,
  handtuecher: 0.85,
};

/** Max units storable per SKU — scales with Fanshop-Stufe (1–5). */
export function merchMaxStockForSku(fanshopLevel: number, sku: MerchSkuId): number {
  const level = Math.max(0, Math.min(5, fanshopLevel));
  const base = (level <= 0 ? 45 : 35 + level * 52) * MERCH_UNIT_SCALE;
  return Math.round(base * SKU_CAPACITY_FACTOR[sku]);
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

/** Whitelabel slots on the market (1 without shop → 5 at max level). */
export function merchMaxBulkOfferSlots(fanshopLevel: number): number {
  const level = Math.max(0, Math.min(5, fanshopLevel));
  if (level <= 0) return 2;
  return Math.min(5, level + 1);
}

export function merchStockRoom(
  fanshopLevel: number,
  sku: MerchSkuId,
  currentStock: number,
): number {
  return Math.max(0, merchMaxStockForSku(fanshopLevel, sku) - currentStock);
}
