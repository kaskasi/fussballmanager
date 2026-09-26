import type { Player } from "../types/player.ts";
import { estimateCa, marketValue } from "./market-value.ts";

export type OfferReaction = "accept" | "counter" | "reject";

export interface TransferOffer {
  id: string;
  player_id: string;
  fee_offer: number;
  week: number;
  status: "pending" | "accepted" | "rejected";
}

export interface TransferState {
  shortlist: string[];
  offers: TransferOffer[];
}

export function emptyTransferState(): TransferState {
  return { shortlist: [], offers: [] };
}

export function toggleShortlist(state: TransferState, playerId: string): TransferState {
  const onList = state.shortlist.includes(playerId);
  return {
    ...state,
    shortlist: onList
      ? state.shortlist.filter((id) => id !== playerId)
      : [...state.shortlist, playerId],
  };
}

export function sellerAskingPrice(player: Player, season: number): number {
  const ca = estimateCa(player.attributes, player.position);
  const wage = player.contract?.wage_weekly ?? 0;
  const seasonsLeft = player.contract ? Math.max(0, player.contract.until_season - season) : 0;
  return marketValue({
    ca,
    age: player.age,
    monthsRemaining: seasonsLeft * 12,
    wage,
    marketWage: Math.max(1, wage),
    demandFactor: 1,
    reputationFactor: 1,
  });
}

/** PRD 05.3 reaction matrix (simplified to three outcomes). */
export function evaluateOffer(feeOffer: number, sellerValue: number): OfferReaction {
  const ratio = feeOffer / Math.max(1, sellerValue);
  if (ratio < 0.7) return "reject";
  if (ratio >= 1.1) return "accept";
  if (ratio >= 1.0) return ratio >= 1.05 ? "accept" : "counter";
  if (ratio >= 0.85) return "counter";
  return "reject";
}

export function counterFee(sellerValue: number, ratio: number): number {
  if (ratio < 0.85) return Math.round(sellerValue * 1.15);
  if (ratio < 1.0) return Math.round(sellerValue * 1.08);
  return Math.round(sellerValue * 1.04);
}

export function submitPurchaseOffer(
  state: TransferState,
  playerId: string,
  feeOffer: number,
  week: number,
): TransferState {
  const offer: TransferOffer = {
    id: `offer_${playerId}_${week}`,
    player_id: playerId,
    fee_offer: feeOffer,
    week,
    status: "pending",
  };
  return {
    ...state,
    offers: [...state.offers.filter((entry) => entry.player_id !== playerId), offer],
  };
}

export function resolveOffer(
  state: TransferState,
  offerId: string,
  reaction: OfferReaction,
  sellerValue: number,
): { state: TransferState; accepted: boolean; counterFee?: number } {
  const offer = state.offers.find((entry) => entry.id === offerId);
  if (!offer) return { state, accepted: false };

  if (reaction === "accept") {
    return {
      state: {
        ...state,
        offers: state.offers.map((entry) =>
          entry.id === offerId ? { ...entry, status: "accepted" } : entry,
        ),
      },
      accepted: true,
    };
  }
  if (reaction === "reject") {
    return {
      state: {
        ...state,
        offers: state.offers.map((entry) =>
          entry.id === offerId ? { ...entry, status: "rejected" } : entry,
        ),
      },
      accepted: false,
    };
  }
  return {
    state: {
      ...state,
      offers: state.offers.map((entry) =>
        entry.id === offerId
          ? { ...entry, fee_offer: counterFee(sellerValue, offer.fee_offer / sellerValue), status: "pending" }
          : entry,
      ),
    },
    accepted: false,
    counterFee: counterFee(sellerValue, offer.fee_offer / sellerValue),
  };
}

export function attemptPurchase(
  state: TransferState,
  player: Player,
  season: number,
  week: number,
): { state: TransferState; accepted: boolean; fee?: number } {
  const asking = sellerAskingPrice(player, season);
  const firstOffer = Math.round(asking * 1.05);
  let next = submitPurchaseOffer(state, player.id, firstOffer, week);
  const offer = next.offers.find((entry) => entry.player_id === player.id);
  if (!offer) return { state, accepted: false };

  const reaction = evaluateOffer(firstOffer, asking);
  if (reaction === "accept") {
    return {
      state: resolveOffer(next, offer.id, "accept", asking).state,
      accepted: true,
      fee: firstOffer,
    };
  }
  if (reaction === "reject") {
    return {
      state: resolveOffer(next, offer.id, "reject", asking).state,
      accepted: false,
    };
  }

  const counter = counterFee(asking, firstOffer / asking);
  next = submitPurchaseOffer(next, player.id, counter, week);
  const counterOffer = next.offers.find((entry) => entry.player_id === player.id);
  if (!counterOffer) return { state, accepted: false };
  return {
    state: resolveOffer(next, counterOffer.id, "accept", asking).state,
    accepted: true,
    fee: counter,
  };
}

export function completePurchase(
  player: Player,
  buyerClubId: string,
  season: number,
): Player {
  return {
    ...player,
    club_id: buyerClubId,
    squad_status: player.age >= 18 ? "pro" : player.squad_status === "u19" ? "u19" : "u17",
    contract: player.contract ?? {
      wage_weekly: Math.max(200, Math.round(player.market_value * 0.008 / 52)),
      bonus_goal: 0,
      bonus_appearance: 0,
      until_season: season + 3,
      guaranteed_minutes_promise: "none",
    },
  };
}
