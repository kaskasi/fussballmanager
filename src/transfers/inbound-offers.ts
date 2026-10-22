/** F5.6 — AI bids on the user's squad (weekly, transfer window). */
import type { Player } from "../types/player.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { hasScheduledTransfer } from "./scheduled-transfers.ts";
import type { TransferState } from "./negotiations.ts";
import { estimateCa } from "./market-value.ts";
import { sellerAskingPrice } from "./negotiations.ts";
import { pickAiBuyerClub } from "./player-sales.ts";
import type { TeamId } from "@fussballmanager/shared";

export interface InboundTransferOffer {
  id: string;
  player_id: string;
  buyer_club_id: string;
  fee: number;
  season: number;
  week: number;
  status: "pending" | "declined" | "accepted";
}

export interface ScanInboundOffersInput {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  leagueClubIds: readonly TeamId[];
  transferState: TransferState;
}

export interface ScanInboundOffersResult {
  transferState: TransferState;
  newOffers: InboundTransferOffer[];
}

/** Max new inbound rows created in one sim week (listed + unsolicited). */
export const MAX_INBOUND_OFFERS_PER_WEEK = 3;
/** Extra roll per player on your transfer list (in addition to listing sale talks). */
export const INBOUND_LISTED_PLAYER_CHANCE = 0.22;

function weekRng(masterSeed: number, season: number, week: number, salt: number): () => number {
  let state = (masterSeed ^ season ^ week ^ salt) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playerOfferRng(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
): () => number {
  let salt = 0x1b0;
  for (const ch of playerId) {
    salt = Math.imul(salt ^ ch.charCodeAt(0), 0x5bd1e995);
  }
  return weekRng(masterSeed, season, week, salt);
}

function hasPendingOffer(state: TransferState, playerId: string): boolean {
  return (state.inbound_offers ?? []).some(
    (row) => row.player_id === playerId && row.status === "pending",
  );
}

function appendOffer(
  state: TransferState,
  offer: InboundTransferOffer,
): TransferState {
  return {
    ...state,
    inbound_offers: [...(state.inbound_offers ?? []), offer],
  };
}

/** Runs all year — a bid accepted outside a window waits for the next one (scheduled-transfers.ts). */
export function scanInboundOffers(input: ScanInboundOffersInput): ScanInboundOffersResult {
  let transferState = input.transferState;
  const newOffers: InboundTransferOffer[] = [];
  const offersThisWeek = (transferState.inbound_offers ?? []).filter(
    (row) => row.season === input.season && row.week === input.week,
  ).length;

  const listed = (transferState.listings ?? []).filter((row) => row.club_id === input.clubId);
  for (const listing of listed) {
    if (offersThisWeek + newOffers.length >= MAX_INBOUND_OFFERS_PER_WEEK) break;
    const player = input.players.find((entry) => entry.id === listing.player_id);
    if (!player || player.squad_status !== "pro") continue;
    if (hasPendingOffer(transferState, player.id)) continue;
    const rng = playerOfferRng(input.masterSeed, input.season, input.week, player.id);
    if (rng() > INBOUND_LISTED_PLAYER_CHANCE) continue;

    const buyerClubId = pickAiBuyerClub(
      input.leagueClubIds,
      player.id,
      input.masterSeed,
      input.season,
      input.week,
    );
    const fee = Math.round(listing.asking_price * (0.86 + rng() * 0.18));
    const offer: InboundTransferOffer = {
      id: `in_${input.season}_${input.week}_${player.id}_${newOffers.length}`,
      player_id: player.id,
      buyer_club_id: buyerClubId,
      fee,
      season: input.season,
      week: input.week,
      status: "pending",
    };
    transferState = appendOffer(transferState, offer);
    newOffers.push(offer);
  }

  if (offersThisWeek + newOffers.length >= MAX_INBOUND_OFFERS_PER_WEEK) {
    return { transferState, newOffers };
  }

  const rng = weekRng(input.masterSeed, input.season, input.week, 0x1b0);
  const unsolicited = input.players.filter((player) => {
    if (player.club_id !== input.clubId) return false;
    if (player.squad_status !== "pro") return false;
    if (hasPendingOffer(transferState, player.id)) return false;
    if (hasScheduledTransfer(transferState, player.id)) return false;
    if (player.state.desire_to_leave) return true;
    const ca = estimateCa(player.attributes, player.position);
    if (ca >= 88 && rng() < 0.12) return true;
    if (player.contract && player.contract.until_season <= input.season && rng() < 0.2) {
      return true;
    }
    return false;
  });

  if (unsolicited.length === 0 || rng() > 0.42) {
    return { transferState, newOffers };
  }

  const player = unsolicited[Math.floor(rng() * unsolicited.length)]!;
  if (hasPendingOffer(transferState, player.id)) {
    return { transferState, newOffers };
  }

  const buyerClubId = pickAiBuyerClub(
    input.leagueClubIds,
    player.id,
    input.masterSeed,
    input.season,
    input.week,
  );
  const asking = sellerAskingPrice(player, input.season);
  const fee = Math.round(asking * (0.88 + rng() * 0.22));
  const offer: InboundTransferOffer = {
    id: `in_${input.season}_${input.week}_${player.id}`,
    player_id: player.id,
    buyer_club_id: buyerClubId,
    fee,
    season: input.season,
    week: input.week,
    status: "pending",
  };
  transferState = appendOffer(transferState, offer);
  newOffers.push(offer);
  return { transferState, newOffers };
}

export function listPendingInboundOffers(
  transferState: TransferState,
  clubId: string,
  players: readonly Player[],
): InboundTransferOffer[] {
  void clubId;
  const ids = new Set(players.map((player) => player.id));
  return (transferState.inbound_offers ?? []).filter(
    (row) => row.status === "pending" && ids.has(row.player_id),
  );
}
