import { processTransferBreakout } from "../development/breakouts.ts";
import { applyTransferFee } from "../economy/club-finances.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import { t } from "../i18n/index.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { cannotPayTransferFeeReason, cannotSubmitPurchaseOfferReason } from "./purchase-block.ts";
import { resolvePurchaseTarget } from "./resolve-purchase-target.ts";
import { appendTransferRecord, createPurchaseRecord } from "./transfer-history.ts";
import { completePurchase } from "./negotiations.ts";

export type FinalizePlayerPurchaseResult =
  | { kind: "ok"; session: GameSession; summary: string }
  | { kind: "blocked"; reason: string };

/** Synchronous purchase apply — UI must not read success from inside patchSession. */
export function finalizePlayerPurchase(
  current: GameSession,
  playerId: string,
  fee: number,
): FinalizePlayerPurchaseResult {
  const target = resolvePurchaseTarget(current.scoutBoard, playerId, current.rivalPlayers);
  const submitReason = cannotSubmitPurchaseOfferReason(current.week, Boolean(target));
  if (submitReason) {
    return { kind: "blocked", reason: submitReason };
  }
  const payReason = cannotPayTransferFeeReason(current.finances, fee);
  if (payReason) {
    return { kind: "blocked", reason: payReason };
  }
  if (!target) {
    return { kind: "blocked", reason: t("transfer.purchase.targetUnavailable") };
  }
  if (current.players.some((player) => player.id === playerId)) {
    return { kind: "blocked", reason: t("transfer.purchase.alreadySigned") };
  }

  const bought = completePurchase(target.player, current.clubId, current.season);
  const shifted = processTransferBreakout(bought, {
    masterSeed: current.masterSeed,
    worldEventId: `purchase_${current.season}_${current.week}_${playerId}_${current.clubId}`,
    week: current.week,
    previousMorale: target.player.state.morale,
    matchFitPoor: false,
  });
  const finalized = shifted.player;
  const targets = { ...current.scoutBoard.targets };
  delete targets[playerId];
  const purchaseRecord = createPurchaseRecord(
    finalized,
    fee,
    current.season,
    current.week,
    target.player.club_id ?? "cl_rival_pool",
    current.clubId,
  );
  let next: GameSession = {
    ...current,
    players: [...current.players, finalized],
    rivalPlayers: current.rivalPlayers.filter((player) => player.id !== playerId),
    transferState: appendTransferRecord(current.transferState, purchaseRecord),
    scoutBoard: { ...current.scoutBoard, targets },
    finances: applyTransferFee(current.finances, fee, current.week),
  };
  const summary = `Zugang ${formatPlayerName(finalized)} für ${formatClubCash(fee)}.`;
  return { kind: "ok", session: next, summary };
}
