import {
  canAffordTransfer,
  formatClubCash,
  transferBudget,
  type ClubFinances,
} from "../economy/club-finances.ts";
import { t, transferWindowHint } from "../i18n/index.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";

/** Block opening the player profile buy flow when there is no valid scout/market target. */
export function cannotOpenPurchaseReason(_week: number, hasTarget: boolean): string | null {
  if (!hasTarget) {
    return t("transfer.purchase.noTarget");
  }
  return null;
}

export function transferWindowClosedReason(week: number): string | null {
  if (!isTransferWindowOpen(week)) {
    return t("transfer.purchase.windowClosed", { hint: transferWindowHint() });
  }
  return null;
}

/**
 * Block submitting offers or finalizing a purchase. The transfer window no longer blocks deals:
 * outside a window the agreed transfer waits for the next one (scheduled-transfers.ts).
 */
export function cannotSubmitPurchaseOfferReason(week: number, hasTarget: boolean): string | null {
  return cannotOpenPurchaseReason(week, hasTarget);
}

/** `committed` = fees already promised for waiting purchases (reserved in the transfer pot). */
export function cannotPayTransferFeeReason(
  finances: ClubFinances,
  fee: number,
  committed = 0,
): string | null {
  if (!(fee > 0)) return t("transfer.purchase.noOffer");
  if (canAffordTransfer(finances, fee + committed)) return null;
  const pot = Math.max(0, transferBudget(finances) - committed);
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
