import type { ClubFinances } from "../economy/club-finances.ts";
import { normalizeClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { MERCH_SKU_IDS, MERCH_SKU_LABEL, type MerchSkuId } from "../economy/merchandising-skus.ts";
import { boardCashFloor } from "../economy/spend-runway.ts";
import type { BoardState } from "../board/board-state.ts";

export type HubCommerceMode = "finance_crisis" | "merchandising";

export interface HubMerchAlert {
  sku: MerchSkuId;
  label: string;
  stock: number;
  pendingOrder: boolean;
}

export interface HubCommerceFocus {
  mode: HubCommerceMode;
  cash: number;
  boardFloor: number;
  merchAlerts: HubMerchAlert[];
}

export const HUB_MERCH_LOW_STOCK_THRESHOLD = 15;

export const HUB_MERCH_OTHER_SKUS: readonly MerchSkuId[] = MERCH_SKU_IDS.filter(
  (id) => id !== "trikots",
);

export interface HubMerchDeskCell {
  sku: MerchSkuId;
  label: string;
  stock: number;
  unitsSoldLastWeek: number;
  pendingOrder: boolean;
  variant: "hero" | "tile";
}

export interface HubMerchDeskView {
  cells: HubMerchDeskCell[];
  totalUnitsSoldLastWeek: number;
}

function merchSkuPendingOrder(
  merch: NonNullable<ReturnType<typeof normalizeClubStadium>["merchandising"]>,
  sku: MerchSkuId,
): boolean {
  return (
    merch.branding_queue.some((order) => (order.units[sku] ?? 0) > 0) ||
    (merch.on_demand_queue ?? []).some((order) => order.sku === sku)
  );
}

export function buildHubMerchDeskView(stadium: ClubStadium): HubMerchDeskView | null {
  const normalized = normalizeClubStadium(stadium);
  const merch = normalized.merchandising;
  if (!merch) return null;

  const sale = merch.last_week_sale;
  let totalUnitsSoldLastWeek = 0;
  const cells: HubMerchDeskCell[] = [];

  for (const sku of MERCH_SKU_IDS) {
    const row = merch.skus[sku];
    if (!row) continue;
    const unitsSoldLastWeek = sale?.units[sku] ?? 0;
    totalUnitsSoldLastWeek += unitsSoldLastWeek;
    cells.push({
      sku,
      label: MERCH_SKU_LABEL[sku],
      stock: row.stock,
      unitsSoldLastWeek,
      pendingOrder: merchSkuPendingOrder(merch, sku),
      variant: sku === "trikots" ? "hero" : "tile",
    });
  }

  return { cells, totalUnitsSoldLastWeek };
}

export function resolveHubCommerceFocus(
  finances: ClubFinances,
  board: BoardState,
  stadium: ClubStadium,
): HubCommerceFocus {
  const floor = boardCashFloor(board);
  const normalized = normalizeClubStadium(stadium);
  const merch = normalized.merchandising;
  const alerts: HubMerchAlert[] = [];
  if (!merch) {
    return {
      mode: finances.cash < floor ? "finance_crisis" : "merchandising",
      cash: finances.cash,
      boardFloor: floor,
      merchAlerts: alerts,
    };
  }
  for (const sku of MERCH_SKU_IDS) {
    const row = merch.skus[sku];
    if (!row) continue;
    const pendingOrder = merchSkuPendingOrder(merch, sku);
    if (row.stock <= HUB_MERCH_LOW_STOCK_THRESHOLD || pendingOrder) {
      alerts.push({
        sku,
        label: MERCH_SKU_LABEL[sku],
        stock: row.stock,
        pendingOrder,
      });
    }
  }
  alerts.sort((a, b) => a.stock - b.stock);

  if (finances.cash < floor) {
    return {
      mode: "finance_crisis",
      cash: finances.cash,
      boardFloor: floor,
      merchAlerts: alerts,
    };
  }
  return {
    mode: "merchandising",
    cash: finances.cash,
    boardFloor: floor,
    merchAlerts: alerts,
  };
}
