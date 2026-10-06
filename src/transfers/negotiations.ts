import { t } from "../i18n/index.ts";
import type { Player } from "../types/player.ts";
import type { TransferRecord } from "./transfer-history.ts";
import { estimateCa, marketValue } from "./market-value.ts";

/** F5.7 — pre-contract signed before contract expiry (PRD 05.6). */
export interface PendingTransfer {
  id: string;
  player_id: string;
  buyer_club_id: string;
  signing_bonus: number;
  wage_weekly: number;
  contract_until_season: number;
  signed_season: number;
  signed_week: number;
  effective_season: number;
  saved_transfer_fee: number;
}

export type OfferReaction = "accept" | "counter" | "reject";

export const MAX_NEGOTIATION_ROUNDS = 4;

export interface TransferOffer {
  id: string;
  player_id: string;
  fee_offer: number;
  week: number;
  status: "pending" | "accepted" | "rejected";
}

/** PRD 05.3 — multi-round club-to-club negotiation session. */
export interface TransferNegotiation {
  id: string;
  player_id: string;
  seller_club_id: string;
  asking_price: number;
  current_offer: number;
  counter_offer?: number;
  round: number;
  patience_rounds_left: number;
  status: "active" | "accepted" | "rejected" | "walked_away";
  failed_lowball_count: number;
  last_reaction: OfferReaction | null;
  week: number;
}

export interface AiClubBudget {
  transfer_budget: number;
  spent: number;
  earned: number;
}

export interface TransferState {
  shortlist: string[];
  offers: TransferOffer[];
  history: TransferRecord[];
  /** Active player purchase negotiations (PRD 05.3). */
  negotiations?: TransferNegotiation[];
  /** F5.6 — per-club AI transfer budgets (PRD 05.5). */
  ai_budgets?: Record<string, AiClubBudget>;
  /** F5.7 — pre-contracts effective at contract end (PRD 05.6). */
  pending_transfers?: PendingTransfer[];
}

export function emptyTransferState(): TransferState {
  return {
    shortlist: [],
    offers: [],
    history: [],
    negotiations: [],
    ai_budgets: {},
    pending_transfers: [],
  };
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

export function reactionMessage(
  reaction: OfferReaction,
  ratio: number,
  counter?: number,
): string {
  if (reaction === "accept") {
    return ratio >= 1.1
      ? t("transfer.negotiation.reaction.acceptHigh")
      : t("transfer.negotiation.reaction.acceptMid");
  }
  if (reaction === "reject") {
    return ratio < 0.7
      ? t("transfer.negotiation.reaction.rejectLow")
      : t("transfer.negotiation.reaction.rejectMid");
  }
  return counter
    ? t("transfer.negotiation.reaction.counter", {
        amount: `${Math.round(counter).toLocaleString("de-DE")} €`,
      })
    : t("transfer.negotiation.reaction.counterFallback");
}

export function startNegotiation(
  state: TransferState,
  player: Player,
  sellerClubId: string,
  season: number,
  week: number,
  openingOffer?: number,
): { state: TransferState; negotiation: TransferNegotiation } {
  const asking = sellerAskingPrice(player, season);
  const offer = openingOffer ?? Math.round(asking * 0.92);
  const negotiation: TransferNegotiation = {
    id: `neg_${player.id}_${week}`,
    player_id: player.id,
    seller_club_id: sellerClubId,
    asking_price: asking,
    current_offer: offer,
    round: 1,
    patience_rounds_left: MAX_NEGOTIATION_ROUNDS,
    status: "active",
    failed_lowball_count: 0,
    last_reaction: null,
    week,
  };
  const negotiations = [
    ...(state.negotiations ?? []).filter((entry) => entry.player_id !== player.id),
    negotiation,
  ];
  return {
    state: submitPurchaseOffer({ ...state, negotiations }, player.id, offer, week),
    negotiation,
  };
}

/** UI shell when negotiation state is not persisted yet (preview / open error). */
export function draftNegotiationPreview(
  player: Player,
  season: number,
  week: number,
): TransferNegotiation {
  const asking = sellerAskingPrice(player, season);
  return {
    id: `neg_preview_${player.id}`,
    player_id: player.id,
    seller_club_id: player.club_id ?? "cl_rival_pool",
    asking_price: asking,
    current_offer: Math.round(asking * 0.92),
    round: 1,
    patience_rounds_left: MAX_NEGOTIATION_ROUNDS,
    status: "active",
    failed_lowball_count: 0,
    last_reaction: null,
    week,
  };
}

export function activeNegotiation(
  state: TransferState,
  playerId: string,
): TransferNegotiation | null {
  return (
    (state.negotiations ?? []).find(
      (entry) => entry.player_id === playerId && entry.status === "active",
    ) ?? null
  );
}

export interface NegotiationRoundResult {
  state: TransferState;
  negotiation: TransferNegotiation;
  accepted: boolean;
  message: string;
  moralePenalty?: number;
}

export function submitNegotiationRound(
  state: TransferState,
  playerId: string,
  feeOffer: number,
): NegotiationRoundResult {
  const current = activeNegotiation(state, playerId);
  if (!current) {
    throw new Error("No active negotiation for player");
  }
  const ratio = feeOffer / Math.max(1, current.asking_price);
  const reaction = evaluateOffer(feeOffer, current.asking_price);
  let patience = current.patience_rounds_left;
  let failedLowballs = current.failed_lowball_count;
  if (ratio < 0.7) {
    failedLowballs += 1;
    patience = Math.max(0, patience - 1);
  } else if (reaction === "counter" && ratio < 0.85) {
    patience = Math.max(0, patience - 1);
  }

  if (reaction === "accept") {
    const accepted: TransferNegotiation = {
      ...current,
      current_offer: feeOffer,
      status: "accepted",
      last_reaction: "accept",
      round: current.round,
    };
    const negotiations = (state.negotiations ?? []).map((entry) =>
      entry.id === current.id ? accepted : entry,
    );
    const resolved = resolveOffer(
      submitPurchaseOffer(state, playerId, feeOffer, current.week),
      `offer_${playerId}_${current.week}`,
      "accept",
      current.asking_price,
    );
    return {
      state: { ...resolved.state, negotiations },
      negotiation: accepted,
      accepted: true,
      message: reactionMessage("accept", ratio),
    };
  }

  if (reaction === "reject" && (patience <= 0 || ratio < 0.7)) {
    const rejected: TransferNegotiation = {
      ...current,
      current_offer: feeOffer,
      status: ratio < 0.7 ? "walked_away" : "rejected",
      patience_rounds_left: patience,
      failed_lowball_count: failedLowballs,
      last_reaction: "reject",
      round: current.round,
    };
    const negotiations = (state.negotiations ?? []).map((entry) =>
      entry.id === current.id ? rejected : entry,
    );
    const resolved = resolveOffer(
      submitPurchaseOffer(state, playerId, feeOffer, current.week),
      `offer_${playerId}_${current.week}`,
      "reject",
      current.asking_price,
    );
    return {
      state: { ...resolved.state, negotiations },
      negotiation: rejected,
      accepted: false,
      message: reactionMessage("reject", ratio),
      moralePenalty: failedLowballs >= 3 ? 10 : undefined,
    };
  }

  const counter = counterFee(current.asking_price, ratio);
  const nextRound = Math.min(MAX_NEGOTIATION_ROUNDS, current.round + 1);
  const updated: TransferNegotiation = {
    ...current,
    current_offer: feeOffer,
    counter_offer: counter,
    round: nextRound,
    patience_rounds_left: patience,
    failed_lowball_count: failedLowballs,
    last_reaction: "counter",
    status: nextRound >= MAX_NEGOTIATION_ROUNDS && patience <= 0 ? "rejected" : "active",
  };
  if (updated.status === "rejected") {
    const negotiations = (state.negotiations ?? []).map((entry) =>
      entry.id === current.id ? updated : entry,
    );
    return {
      state: { ...state, negotiations },
      negotiation: updated,
      accepted: false,
      message: t("transfer.negotiation.roundsExhausted"),
      moralePenalty: failedLowballs >= 3 ? 10 : undefined,
    };
  }
  const negotiations = (state.negotiations ?? []).map((entry) =>
    entry.id === current.id ? updated : entry,
  );
  const withOffer = submitPurchaseOffer({ ...state, negotiations }, playerId, feeOffer, current.week);
  return {
    state: withOffer,
    negotiation: updated,
    accepted: false,
    message: reactionMessage("counter", ratio, counter),
  };
}

function acceptNegotiationAtFee(
  state: TransferState,
  playerId: string,
  feeOffer: number,
): NegotiationRoundResult {
  const current = activeNegotiation(state, playerId);
  if (!current) {
    throw new Error("No active negotiation for player");
  }
  const ratio = feeOffer / Math.max(1, current.asking_price);
  const accepted: TransferNegotiation = {
    ...current,
    current_offer: feeOffer,
    counter_offer: undefined,
    status: "accepted",
    last_reaction: "accept",
    round: current.round,
  };
  const negotiations = (state.negotiations ?? []).map((entry) =>
    entry.id === current.id ? accepted : entry,
  );
  const resolved = resolveOffer(
    submitPurchaseOffer(state, playerId, feeOffer, current.week),
    `offer_${playerId}_${current.week}`,
    "accept",
    current.asking_price,
  );
  return {
    state: { ...resolved.state, negotiations },
    negotiation: accepted,
    accepted: true,
    message: reactionMessage("accept", ratio),
  };
}

/** Player explicitly accepts the seller counter — always closes at counter fee (PRD 05.3). */
export function acceptCounterOffer(
  state: TransferState,
  playerId: string,
): NegotiationRoundResult {
  const current = activeNegotiation(state, playerId);
  if (!current?.counter_offer) {
    throw new Error("No counter-offer to accept");
  }
  return acceptNegotiationAtFee(state, playerId, current.counter_offer);
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
