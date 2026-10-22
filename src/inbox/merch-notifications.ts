import { formatClubCash } from "../economy/club-finances.ts";
import {
  MERCH_SKU_LABEL,
  normalizeClubMerchandising,
  type MerchSaleSummary,
  type MerchStockDisposal,
} from "../economy/merchandising.ts";
import { MERCH_SKU_IDS, type MerchSkuId } from "../economy/merchandising-skus.ts";
import { HUB_MERCH_LOW_STOCK_THRESHOLD } from "../hub/hub-finance-merch.ts";
import { t } from "../i18n/index.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";

function merchSkuName(sku: MerchSkuId): string {
  const key = `merch.skuName.${sku}`;
  const label = t(key);
  return label === key ? MERCH_SKU_LABEL[sku] : label;
}

export function merchSaleSummaryClubEventMessage(summary: MerchSaleSummary): string {
  const skuLabel = merchSkuName(summary.sku);
  const netLabel =
    summary.net >= 0
      ? t("merch.saleSummary.profit", { amount: formatClubCash(summary.net) })
      : t("merch.saleSummary.loss", { amount: formatClubCash(Math.abs(summary.net)) });
  return t("merch.saleSummary.mail", {
    sku: skuLabel,
    units: summary.units,
    gross: formatClubCash(summary.gross),
    result: netLabel,
  });
}

export function merchStockDisposalClubEventMessage(disposal: MerchStockDisposal): string {
  return t("merch.disposal.mail", {
    sku: merchSkuName(disposal.sku),
    units: disposal.unitsDiscarded,
    loss: formatClubCash(disposal.writeOff),
  });
}

/**
 * Stock warnings when an SKU crosses the low-stock line or sells out this week.
 * Sales run weekly; the level-0 fan shop only holds a few weeks of demand, so it
 * used to run empty silently (playtest 2026-10-21). Only transitions mail — no weekly spam.
 */
export function merchStockAlertClubEventMessages(
  before: ClubStadium | undefined,
  after: ClubStadium | undefined,
): string[] {
  const prev = normalizeClubMerchandising(before?.merchandising);
  const next = normalizeClubMerchandising(after?.merchandising);
  const messages: string[] = [];
  for (const sku of MERCH_SKU_IDS) {
    const was = prev.skus[sku]?.stock ?? 0;
    const now = next.skus[sku]?.stock ?? 0;
    if (now <= 0 && was > 0) {
      messages.push(t("merch.stockAlert.soldOut", { sku: merchSkuName(sku) }));
    } else if (now > 0 && now <= HUB_MERCH_LOW_STOCK_THRESHOLD && was > HUB_MERCH_LOW_STOCK_THRESHOLD) {
      messages.push(t("merch.stockAlert.low", { sku: merchSkuName(sku), units: now }));
    }
  }
  return messages;
}
