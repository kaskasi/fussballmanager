import { processTransferBreakout } from "../development/breakouts.ts";
import { applyTransferFee } from "../economy/club-finances.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import { t } from "../i18n/index.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { ContractOffer } from "./contract-talks.ts";
import { applyContractOffer, submitContractOffer } from "./contract-talks.ts";
import { calendarDayIndex } from "../sim/calendar-days.ts";
import { cannotPayTransferFeeReason, cannotSubmitPurchaseOfferReason } from "./purchase-block.ts";
import { resolvePurchaseTarget } from "./resolve-purchase-target.ts";
import { appendTransferRecord, createPurchaseRecord } from "./transfer-history.ts";
import { completePurchase, type TransferState } from "./negotiations.ts";

export interface PendingPlayerPurchase {
  id: string;
  player_id: string;
  fee: number;
  seller_club_id: string;
  season: number;
  week: number;
  negotiation_id: string;
}

export type StagePendingPurchaseResult =
  | { kind: "ok"; session: GameSession }
  | { kind: "blocked"; reason: string };

export type CommitPendingPurchaseResult =
  | { kind: "ok"; session: GameSession; summary: string }
  | { kind: "blocked"; reason: string }
  | { kind: "contract_rejected"; session: GameSession; message: string; abort: boolean };

export type AbortPendingPurchaseResult = { session: GameSession; summary: string };

function pendingForPlayer(state: TransferState, playerId: string): PendingPlayerPurchase | null {
  return (state.pending_purchases ?? []).find((row) => row.player_id === playerId) ?? null;
}

export function stagePendingPurchase(
  current: GameSession,
  playerId: string,
  fee: number,
  negotiationId: string,
): StagePendingPurchaseResult {
  const target = resolvePurchaseTarget(
    current.scoutBoard,
    playerId,
    current.rivalPlayers,
    current.transferState,
  );
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
  if (pendingForPlayer(current.transferState, playerId)) {
    return { kind: "blocked", reason: t("transfer.purchase.pendingContract") };
  }

  const pending: PendingPlayerPurchase = {
    id: `pp_${current.season}_${current.week}_${playerId}`,
    player_id: playerId,
    fee,
    seller_club_id: target.player.club_id ?? "cl_rival_pool",
    season: current.season,
    week: current.week,
    negotiation_id: negotiationId,
  };

  const negotiations = (current.transferState.negotiations ?? []).filter(
    (row) => row.player_id !== playerId,
  );

  return {
    kind: "ok",
    session: {
      ...current,
      transferState: {
        ...current.transferState,
        negotiations,
        pending_purchases: [...(current.transferState.pending_purchases ?? []), pending],
      },
    },
  };
}

export function commitPendingPurchase(
  current: GameSession,
  playerId: string,
  offer: ContractOffer,
): CommitPendingPurchaseResult {
  const pending = pendingForPlayer(current.transferState, playerId);
  if (!pending) {
    return { kind: "blocked", reason: t("transfer.purchase.noPending") };
  }
  const target = resolvePurchaseTarget(
    current.scoutBoard,
    playerId,
    current.rivalPlayers,
    current.transferState,
  );
  if (!target) {
    return { kind: "blocked", reason: t("transfer.purchase.targetUnavailable") };
  }

  const calendar = {
    season: current.season,
    week: current.week,
    weekday: current.weekday ?? 1,
    dayIndex: calendarDayIndex(current.season, current.week, current.weekday ?? 1),
  };
  const talk = submitContractOffer(target.player, current.season, offer, calendar);
  const rivalPlayers = current.rivalPlayers.map((player) =>
    player.id === playerId ? talk.player : player,
  );

  let session: GameSession = { ...current, rivalPlayers };

  if (!talk.accepted) {
    const failed = talk.player.state.contract_failed_offers ?? 0;
    const lock = talk.player.state.contract_talks_locked_until_day;
    const abort =
      failed >= 3 ||
      Boolean(talk.player.state.desire_to_leave) ||
      (lock != null && lock > 0);
    if (abort) {
      const aborted = abortPendingPurchase(session, playerId);
      return {
        kind: "contract_rejected",
        session: aborted.session,
        message: talk.message,
        abort: true,
      };
    }
    return {
      kind: "contract_rejected",
      session,
      message: talk.message,
      abort: false,
    };
  }

  const signedPlayer = applyContractOffer(talk.player, current.season, offer);
  const bought = completePurchase(signedPlayer, current.clubId, current.season);
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
    pending.fee,
    current.season,
    current.week,
    pending.seller_club_id,
    current.clubId,
  );

  const withoutPending = (current.transferState.pending_purchases ?? []).filter(
    (row) => row.player_id !== playerId,
  );

  session = {
    ...session,
    players: [...session.players, finalized],
    rivalPlayers: session.rivalPlayers.filter((player) => player.id !== playerId),
    transferState: appendTransferRecord(
      {
        ...session.transferState,
        pending_purchases: withoutPending,
      },
      purchaseRecord,
    ),
    scoutBoard: { ...session.scoutBoard, targets },
    finances: applyTransferFee(session.finances, pending.fee, current.week),
  };

  const summary = `Zugang ${formatPlayerName(finalized)} für ${formatClubCash(pending.fee)}.`;
  return { kind: "ok", session, summary };
}

export function abortPendingPurchase(
  current: GameSession,
  playerId: string,
): AbortPendingPurchaseResult {
  const pending = pendingForPlayer(current.transferState, playerId);
  const withoutPending = (current.transferState.pending_purchases ?? []).filter(
    (row) => row.player_id !== playerId,
  );
  const session: GameSession = {
    ...current,
    transferState: {
      ...current.transferState,
      pending_purchases: withoutPending,
      negotiations: (current.transferState.negotiations ?? []).filter(
        (row) => row.player_id !== playerId,
      ),
    },
  };
  const summary = pending ? t("transfer.purchase.dealCollapsed") : t("transfer.purchase.dealAborted");
  return { session, summary };
}
