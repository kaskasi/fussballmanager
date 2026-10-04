import {
  canAffordTransfer,
  formatClubCash,
  transferBudget,
  type ClubFinances,
} from "../economy/club-finances.ts";
import { isTransferWindowOpen, TRANSFER_WINDOW_HINT } from "../sim/transfer-windows.ts";

export function cannotOpenPurchaseReason(week: number, hasTarget: boolean): string | null {
  if (!hasTarget) {
    return "Kauf nicht möglich: Spieler ist kein Scout-Ziel — Akte über Scouting oder Markt öffnen.";
  }
  if (!isTransferWindowOpen(week)) {
    return `Kauf nicht möglich: Transferfenster zu. ${TRANSFER_WINDOW_HINT}`;
  }
  return null;
}

export function cannotPayTransferFeeReason(finances: ClubFinances, fee: number): string | null {
  if (!(fee > 0)) return "Kauf nicht möglich: Angebot fehlt.";
  if (canAffordTransfer(finances, fee)) return null;
  const pot = transferBudget(finances);
  if (finances.cash >= fee && pot < fee) {
    return `Kauf nicht möglich: Transfer-Topf ${formatClubCash(pot)}, Angebot ${formatClubCash(fee)}. Kasse ${formatClubCash(finances.cash)} reicht — der Topf nicht.`;
  }
  return `Kauf nicht möglich: Transfer-Topf ${formatClubCash(pot)}, benötigt ${formatClubCash(fee)}.`;
}
