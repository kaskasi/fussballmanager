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

const LOW_STOCK_THRESHOLD = 15;

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
    const pendingOrder =
      merch.branding_queue.some((order) => (order.units[sku] ?? 0) > 0) ||
      (merch.on_demand_queue ?? []).some((order) => order.sku === sku);
    if (row.stock <= LOW_STOCK_THRESHOLD || pendingOrder) {
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
