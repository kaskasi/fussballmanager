import {
  canAffordTransfer,
  formatClubCash,
  transferBudget,
  type ClubFinances,
} from "../economy/club-finances.ts";
import { t, transferWindowHint } from "../i18n/index.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";

export function cannotOpenPurchaseReason(week: number, hasTarget: boolean): string | null {
  if (!hasTarget) {
    return t("transfer.purchase.noTarget");
  }
  if (!isTransferWindowOpen(week)) {
    return t("transfer.purchase.windowClosed", { hint: transferWindowHint() });
  }
  return null;
}

export function cannotPayTransferFeeReason(finances: ClubFinances, fee: number): string | null {
  if (!(fee > 0)) return t("transfer.purchase.noOffer");
  if (canAffordTransfer(finances, fee)) return null;
  const pot = transferBudget(finances);
  if (finances.cash >= fee && pot < fee) {
    return t("transfer.purchase.potSplit", {
      pot: formatClubCash(pot),
      fee: formatClubCash(fee),
      cash: formatClubCash(finances.cash),
    });
  }
  return t("transfer.purchase.potShort", {
    pot: formatClubCash(pot),
    fee: formatClubCash(fee),
  });
}
