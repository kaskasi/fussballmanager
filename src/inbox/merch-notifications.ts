import { formatClubCash } from "../economy/club-finances.ts";
import {
  MERCH_SKU_LABEL,
  type MerchSaleSummary,
  type MerchStockDisposal,
} from "../economy/merchandising.ts";
import { t } from "../i18n/index.ts";

export function merchSaleSummaryClubEventMessage(summary: MerchSaleSummary): string {
  const skuLabel = MERCH_SKU_LABEL[summary.sku];
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
    sku: MERCH_SKU_LABEL[disposal.sku],
    units: disposal.unitsDiscarded,
    loss: formatClubCash(disposal.writeOff),
  });
}
