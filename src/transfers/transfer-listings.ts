import type { ClubFinances } from "../economy/club-finances.ts";
import { creditClubCash } from "../economy/club-finances.ts";
import { completeSale } from "./player-sales.ts";
import { createSaleRecord } from "./transfer-history.ts";
import type { Player } from "../types/player.ts";
import type { TeamId } from "@fussballmanager/shared";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
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
  if (!isTransferWindowOpen(input.week)) return input.state;
  const own = (input.state.listings ?? []).filter((row) => row.club_id === input.userClubId);
  const opening = openingMarketListings(input.state, input.players, input.userClubId);
  const openingIds = new Set(opening.map((row) => row.player_id));
  const persistedRival = (input.state.listings ?? []).filter(
    (row) =>
      row.club_id !== input.userClubId &&
      !openingIds.has(row.player_id) &&
      listingStillValid(row, input.players, input.userClubId),
  );
  const reservedIds = new Set([
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

/** AI bids arrive for our listed players. One new bid per week. */
export function scanListingBids(input: {
  state: TransferState;
  players: readonly Player[];
  userClubId: string;
  season: number;
  week: number;
  masterSeed: number;
  leagueClubIds: readonly TeamId[];
}): { state: TransferState; opened: TransferNegotiation | null } {
  if (!isTransferWindowOpen(input.week)) return { state: input.state, opened: null };
  const already = (input.state.negotiations ?? []).some(
    (entry) => entry.side === "sell" && entry.week === input.week && entry.status === "active",
  );
  if (already) return { state: input.state, opened: null };
  const rng = weekRng(input.masterSeed, input.season, input.week + 3);
  const listed = (input.state.listings ?? []).filter((row) => row.club_id === input.userClubId);
  if (listed.length === 0 || rng() > 0.8) return { state: input.state, opened: null };
  const listing = listed[Math.floor(rng() * listed.length)]!;
  const player = input.players.find((entry) => entry.id === listing.player_id);
  if (!player) return { state: input.state, opened: null };
  const buyers = input.leagueClubIds.filter((id) => id !== input.userClubId);
  const buyer = buyers[Math.floor(rng() * buyers.length)] ?? buyers[0];
  if (!buyer) return { state: input.state, opened: null };
  const bid = Math.round(listing.asking_price * (0.82 + rng() * 0.2));
  const opened = openSaleNegotiation({
    state: input.state,
    player,
    buyerClubId: buyer,
    season: input.season,
    week: input.week,
    bid,
  });
  return { state: opened.state, opened: opened.negotiation };
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

  if (demandedFee <= Math.round(bid * 1.02)) {
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
      message: "Angebot angenommen.",
    };
  }

  const stretch = demandedFee / Math.max(1, current.asking_price);
  let patience = current.patience_rounds_left;
  if (stretch > 1.12) patience = Math.max(0, patience - 1);
  const nextRound = Math.min(MAX_NEGOTIATION_ROUNDS, current.round + 1);
  const raisedBid = Math.round(Math.min(current.asking_price, bid * 1.06));
  const walked = patience <= 0 || (nextRound >= MAX_NEGOTIATION_ROUNDS && stretch > 1.2);
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
      ? "Der Interessent steigt aus."
      : `Gegenvorschlag: ${raisedBid.toLocaleString("de-DE")} €`,
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
}): {
  players: Player[];
  rivalPlayers: Player[];
  finances: ClubFinances;
  transferState: TransferState;
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
    finances: creditClubCash(input.finances, input.fee, input.week, "player_sale"),
    transferState: {
      ...unlistPlayer(input.transferState, input.playerId),
      history: [...(input.transferState.history ?? []), record],
    },
  };
}

export function listedPlayerCa(player: Player): number {
  return Math.round(estimateCa(player.attributes, player.position));
}
