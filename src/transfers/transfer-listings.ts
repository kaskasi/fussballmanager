import { applyPlayerSaleIncome, formatClubCash } from "../economy/club-finances.ts";
import type { ClubFinances } from "../economy/club-finances.ts";
import { t } from "../i18n/index.ts";
import { completeSale, pickAiBuyerClub } from "./player-sales.ts";
import { createSaleRecord } from "./transfer-history.ts";
import type { Player } from "../types/player.ts";
import type { TeamId } from "@fussballmanager/shared";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
import { scheduledPlayerIds, scheduleTransfer, type ScheduledTransfer } from "./scheduled-transfers.ts";
import { openingMarketListings } from "./opening-transfer-market.ts";
import { estimateCa } from "./market-value.ts";
import {
  MAX_NEGOTIATION_ROUNDS,
  sellerAskingPrice,
  type NegotiationRoundResult,
  type TransferNegotiation,
  type TransferState,
} from "./negotiations.ts";

export interface TransferListing {
  player_id: string;
  club_id: string;
  asking_price: number;
  listed_season: number;
  listed_week: number;
}

export interface ListingSearch {
  query?: string;
  position?: string;
  maxAge?: number;
  clubId?: string;
}

function weekRng(masterSeed: number, season: number, week: number): () => number {
  let state = (masterSeed ^ (season * 17) ^ (week * 131) ^ 0x51a7) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isPlayerListed(state: TransferState, playerId: string): boolean {
  return (state.listings ?? []).some((row) => row.player_id === playerId);
}

export function clubListingsForPlayers(
  state: TransferState,
  clubId: string,
  players: readonly Player[],
): TransferListing[] {
  const ids = new Set(players.map((player) => player.id));
  return (state.listings ?? []).filter(
    (row) => row.club_id === clubId && ids.has(row.player_id),
  );
}

export function listPlayerForSale(
  state: TransferState,
  player: Player,
  season: number,
  week: number,
): TransferState {
  if (!player.club_id) return state;
  const listing: TransferListing = {
    player_id: player.id,
    club_id: player.club_id,
    asking_price: sellerAskingPrice(player, season),
    listed_season: season,
    listed_week: week,
  };
  const listings = [
    ...(state.listings ?? []).filter((row) => row.player_id !== player.id),
    listing,
  ];
  return { ...state, listings };
}

export function unlistPlayer(state: TransferState, playerId: string): TransferState {
  return {
    ...state,
    listings: (state.listings ?? []).filter((row) => row.player_id !== playerId),
  };
}

export function searchListings(
  listings: readonly TransferListing[],
  players: readonly Player[],
  filters: ListingSearch,
): Array<{ listing: TransferListing; player: Player }> {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const rows: Array<{ listing: TransferListing; player: Player }> = [];
  for (const listing of listings) {
    const player = players.find((entry) => entry.id === listing.player_id);
    if (!player) continue;
    if (filters.position && player.position !== filters.position) continue;
    if (filters.maxAge != null && player.age > filters.maxAge) continue;
    if (filters.clubId && listing.club_id !== filters.clubId) continue;
    if (query) {
      const name = `${player.name.first} ${player.name.last}`.toLowerCase();
      if (!name.includes(query) && !listing.club_id.toLowerCase().includes(query)) continue;
    }
    rows.push({ listing, player });
  }
  return rows.sort((a, b) => a.listing.asking_price - b.listing.asking_price);
}

const MAX_RIVAL_LISTINGS_ON_BOARD = 32;

function listingStillValid(
  listing: TransferListing,
  players: readonly Player[],
  userClubId: string,
): boolean {
  if (listing.club_id === userClubId) return false;
  const player = players.find((entry) => entry.id === listing.player_id);
  return Boolean(
    player && player.squad_status === "pro" && player.club_id === listing.club_id,
  );
}

/** Add new AI listings; keep opening + existing rival rows until sold or invalid. */
export function refreshAiListings(input: {
  state: TransferState;
  players: readonly Player[];
  userClubId: string;
  season: number;
  week: number;
  masterSeed: number;
  leagueClubIds: readonly TeamId[];
}): TransferState {
  // Runs all year: deals outside a window wait for the next one (scheduled-transfers.ts).
  const scheduled = scheduledPlayerIds(input.state);
  const own = (input.state.listings ?? []).filter((row) => row.club_id === input.userClubId);
  const opening = openingMarketListings(input.state, input.players, input.userClubId);
  const openingIds = new Set(opening.map((row) => row.player_id));
  const persistedRival = (input.state.listings ?? []).filter(
    (row) =>
      row.club_id !== input.userClubId &&
      !openingIds.has(row.player_id) &&
      !scheduled.has(row.player_id) &&
      listingStillValid(row, input.players, input.userClubId),
  );
  const reservedIds = new Set([
    ...scheduled,
    ...own.map((row) => row.player_id),
    ...opening.map((row) => row.player_id),
    ...persistedRival.map((row) => row.player_id),
  ]);
  const clubsWithListing = new Set([
    ...opening.map((row) => row.club_id),
    ...persistedRival.map((row) => row.club_id),
  ]);

  const rng = weekRng(input.masterSeed, input.season, input.week);
  const ai: TransferListing[] = [];
  const rivalCount = opening.length + persistedRival.length;
  if (rivalCount < MAX_RIVAL_LISTINGS_ON_BOARD) {
    for (const clubId of input.leagueClubIds) {
      if (clubId === input.userClubId) continue;
      if (clubsWithListing.has(clubId)) continue;
      if (rivalCount + ai.length >= MAX_RIVAL_LISTINGS_ON_BOARD) break;
      const squad = input.players.filter(
        (player) => player.club_id === clubId && player.squad_status === "pro",
      );
      if (squad.length === 0) continue;
      const ranked = [...squad].sort((a, b) => b.age - a.age || a.market_value - b.market_value);
      const pick = ranked[Math.floor(rng() * Math.min(4, ranked.length))]!;
      if (reservedIds.has(pick.id)) continue;
      if (rng() > 0.72) continue;
      ai.push({
        player_id: pick.id,
        club_id: clubId,
        asking_price: sellerAskingPrice(pick, input.season),
        listed_season: input.season,
        listed_week: input.week,
      });
      reservedIds.add(pick.id);
      clubsWithListing.add(clubId);
    }
  }
  return { ...input.state, listings: [...own, ...opening, ...persistedRival, ...ai] };
}

export function openSaleNegotiation(input: {
  state: TransferState;
  player: Player;
  buyerClubId: string;
  season: number;
  week: number;
  bid: number;
}): { state: TransferState; negotiation: TransferNegotiation } {
  const asking = sellerAskingPrice(input.player, input.season);
  const negotiation: TransferNegotiation = {
    id: `sale_${input.player.id}_${input.week}`,
    player_id: input.player.id,
    seller_club_id: input.player.club_id ?? "user",
    asking_price: asking,
    current_offer: input.bid,
    counter_offer: input.bid,
    round: 1,
    patience_rounds_left: MAX_NEGOTIATION_ROUNDS,
    status: "active",
    failed_lowball_count: 0,
    last_reaction: null,
    week: input.week,
    side: "sell",
    buyer_club_id: input.buyerClubId,
  };
  const negotiations = [
    ...(input.state.negotiations ?? []).filter(
      (entry) => entry.player_id !== input.player.id || entry.status !== "active",
    ),
    negotiation,
  ];
  return { state: { ...input.state, negotiations }, negotiation };
}

/** Per listed player per week — tuned so a full sale list gets several bites, not ~0.2/week. */
export const LISTING_BID_CHANCE = 0.34;
export const MAX_LISTING_BIDS_PER_WEEK = 4;

function listingBidRng(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
): () => number {
  let salt = week;
  for (const ch of playerId) {
    salt = Math.imul(salt ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return weekRng(masterSeed, season, week + salt);
}

/** AI bids on our transfer-list players (PRD 05 — sale negotiations, side sell). */
export function scanListingBids(input: {
  state: TransferState;
  players: readonly Player[];
  userClubId: string;
  season: number;
  week: number;
  masterSeed: number;
  leagueClubIds: readonly TeamId[];
}): { state: TransferState; opened: TransferNegotiation[] } {
  let state = input.state;
  const opened: TransferNegotiation[] = [];
  const busyPlayers = new Set<string>();
  for (const entry of state.negotiations ?? []) {
    if (entry.side === "sell" && entry.status === "active") {
      busyPlayers.add(entry.player_id);
    }
  }
  for (const offer of state.inbound_offers ?? []) {
    if (offer.status === "pending") {
      busyPlayers.add(offer.player_id);
    }
  }

  const listed = (state.listings ?? []).filter((row) => row.club_id === input.userClubId);
  if (listed.length === 0) {
    return { state, opened };
  }

  const ordered = [...listed].sort((a, b) => a.player_id.localeCompare(b.player_id));
  for (const listing of ordered) {
    if (opened.length >= MAX_LISTING_BIDS_PER_WEEK) break;
    if (busyPlayers.has(listing.player_id)) continue;
    const player = input.players.find((entry) => entry.id === listing.player_id);
    if (!player || player.squad_status !== "pro") continue;

    const rng = listingBidRng(input.masterSeed, input.season, input.week, listing.player_id);
    if (rng() > LISTING_BID_CHANCE) continue;

    const buyerClubId = pickAiBuyerClub(
      input.leagueClubIds,
      listing.player_id,
      input.masterSeed,
      input.season,
      input.week,
    );
    const bid = Math.round(listing.asking_price * (0.82 + rng() * 0.22));
    const step = openSaleNegotiation({
      state,
      player,
      buyerClubId,
      season: input.season,
      week: input.week,
      bid,
    });
    state = step.state;
    opened.push(step.negotiation);
    busyPlayers.add(listing.player_id);
  }

  return { state, opened };
}

export function submitSaleRound(
  state: TransferState,
  playerId: string,
  demandedFee: number,
): NegotiationRoundResult {
  const current = (state.negotiations ?? []).find(
    (entry) => entry.player_id === playerId && entry.status === "active" && entry.side === "sell",
  );
  if (!current) throw new Error("No active sale negotiation");
  const bid = current.counter_offer ?? current.current_offer;
  const negotiationsOf = (next: TransferNegotiation) =>
    (state.negotiations ?? []).map((entry) => (entry.id === current.id ? next : entry));

  if (demandedFee <= Math.round(bid * 1.06)) {
    const accepted: TransferNegotiation = {
      ...current,
      current_offer: bid,
      status: "accepted",
      last_reaction: "accept",
    };
    return {
      state: { ...state, negotiations: negotiationsOf(accepted) },
      negotiation: accepted,
      accepted: true,
      message: t("transfer.sale.accepted"),
    };
  }

  const stretch = demandedFee / Math.max(1, current.asking_price);
  let patience = current.patience_rounds_left;
  if (stretch > 1.2) patience = Math.max(0, patience - 1);
  const nextRound = Math.min(MAX_NEGOTIATION_ROUNDS, current.round + 1);
  const raisedBid = Math.round(Math.min(current.asking_price, bid * 1.1));
  const walked = patience <= 0 && stretch > 1.28;
  const updated: TransferNegotiation = {
    ...current,
    current_offer: demandedFee,
    counter_offer: raisedBid,
    round: nextRound,
    patience_rounds_left: patience,
    last_reaction: walked ? "reject" : "counter",
    status: walked ? "walked_away" : "active",
  };
  return {
    state: { ...state, negotiations: negotiationsOf(updated) },
    negotiation: updated,
    accepted: false,
    message: walked
      ? t("transfer.sale.buyerWalked")
      : t("transfer.sale.counter", { amount: formatClubCash(raisedBid) }),
  };
}

export function applyListedSale(input: {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  finances: ClubFinances;
  transferState: TransferState;
  playerId: string;
  fee: number;
  buyerClubId: string;
  season: number;
  week: number;
  userClubId: string;
  boardCashFloor: number;
}): {
  players: Player[];
  rivalPlayers: Player[];
  finances: ClubFinances;
  transferState: TransferState;
  /** Set when the window is closed: the player stays until the next window opens. */
  scheduled?: ScheduledTransfer;
} {
  const player = input.players.find((entry) => entry.id === input.playerId);
  if (!player) {
    return {
      players: [...input.players],
      rivalPlayers: [...input.rivalPlayers],
      finances: input.finances,
      transferState: input.transferState,
    };
  }
  if (!isTransferWindowOpen(input.week)) {
    const scheduled = scheduleTransfer({
      state: unlistPlayer(input.transferState, input.playerId),
      player,
      direction: "out",
      otherClubId: input.buyerClubId,
      fee: input.fee,
      season: input.season,
      week: input.week,
    });
    return {
      players: [...input.players],
      rivalPlayers: [...input.rivalPlayers],
      finances: input.finances,
      transferState: scheduled.state,
      scheduled: scheduled.entry,
    };
  }
  const sold = completeSale(player, input.buyerClubId, input.season);
  const record = createSaleRecord(
    sold,
    input.fee,
    input.season,
    input.week,
    input.userClubId,
    input.buyerClubId,
  );
  return {
    players: input.players.filter((entry) => entry.id !== input.playerId),
    rivalPlayers: [...input.rivalPlayers.filter((entry) => entry.id !== input.playerId), sold],
    finances: applyPlayerSaleIncome(
      input.finances,
      input.fee,
      input.week,
      input.boardCashFloor,
    ),
    transferState: {
      ...unlistPlayer(input.transferState, input.playerId),
      history: [...(input.transferState.history ?? []), record],
    },
  };
}

export function listedPlayerCa(player: Player): number {
  return Math.round(estimateCa(player.attributes, player.position));
}
